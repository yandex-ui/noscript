(function() {

//  ---------------------------------------------------------------------------------------------------------------  //
//  no.View
//  ---------------------------------------------------------------------------------------------------------------  //

/**
 * Создает View. Конструктор не используется напрямую, View создаются через no.View.create.
 * @class Класс, реализующий View
 * @constructor
 * @augments no.Events
 */
no.View = function() {};

//  ---------------------------------------------------------------------------------------------------------------  //

no.extend(no.View.prototype, no.Events);

//  ---------------------------------------------------------------------------------------------------------------  //

/**
 * @see no.V.STATUS
 * @enum {Number}
 * @borrows no.V.STATUS as no.View.prototype.STATUS
 */
no.View.prototype.STATUS = no.V.STATUS;

/**
 * Закешированный $(document)
 * @type {jQuery}
 * @private
 */
no.View.prototype._$document = $(document);

/**
 * Закешированный $(window)
 * @type {jQuery}
 * @private
 */
no.View.prototype._$window = $(window);

no.View.prototype._init = function(id, params, async) {
    this.id = id;
    this.params = params || {};
    /**
     * Флаг того, что блок асинхронный.
     * @type {Boolean}
     */
    this.async = async;

    this.info = no.View.info(id);

    this.key = no.View.getKey(id, params, this.info);

    //  Создаем нужные модели (или берем их из кэша, если они уже существуют).
    var model_ids = this.info.models;
    var models = this.models = {};
    for (var i = 0, l = model_ids.length; i < l; i++) {
        var model_id = model_ids[i];
        models[model_id] = no.Model.create(model_id, params);
    }

    this.views = null;
    this.node = null;

    /**
     * Статус View.
     * @see no.V.STATUS
     * @type {Number}
     * @private
     */
    this.status = this.STATUS.NONE;

    this.timestamp = 0;

    /**
     * jquery-namespace для событий.
     * @type {String}
     * @private
     */
    this._eventNS = '.no-view-' + this.id;

    // события, которые надо забиндить сразу при создании блока
    for (var i = 0, j = this.info.createEvents.length; i < j; i++) {
        var event = this.info.createEvents[i];
        this.on(event[0], event[1]);
    }

    this.trigger('init');
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.View.getKey = function(id, params, info) {
    //  Ключ можно вычислить даже для неопределенных view,
    //  в частности, для боксов.
    info = info || no.View.info(id) || {};

    var key = 'view=' + id;

    var pNames = info.pNames || [];
    for (var i = 0, l = pNames.length; i < l; i++) {
        var pName = pNames[i];
        var pValue = params[pName];
        if (pValue != null) {
            key += '&' + pName + '=' + pValue;
        }
    }

    return key;
};

//  ---------------------------------------------------------------------------------------------------------------  //

var _infos = {};
var _ctors = {};

/**
 * Определяет новый View.
 * @description
 * no.events представляет из себя объект {"eventDecl1": "handler1", "eventDecl2": "handler2"}.
 * "eventDecl" записывается в виде "eventName[ selector]".
 * "selector" опционален, если его нет, то события регистрируется на ноду View.
 * "handler" может быть строка (тогда она заменится на метод прототипа) или функция.
 * Все хендлеры биндятся на экземпляр View.
 * Разделение на типы событий происходит автоматически по следующим правилам (в порядке приоритета):
 *   - если selector === "window" || selector == "document", то обработчик регистрируется по событию show
 *   - если eventName === "resize", то обработчик регистрируется по событию show
 *   - если eventName === "scroll", то обработчик регистрируется по событию htmlinit с помощью $viewNode.find(selector).on(eventName, handler)
 *   - иначе обработчик регистрируется по событию htmlinit с помощью $viewNode.on(eventName, selector, handler)
 * @param {String} id Название View.
 * @param {Object} info Декларация View.
 * @param {Function} [info.ctor] Конструтор.
 * @param {Object} [info.methods] Методы, переопределяющие стандартные методы View. Если указан, то ctor не используется.
 * @param {Array} [info.models] Массив моделей, от которых зависит View.
 * @param {Object} [info.events] DOM-события, на которые подписывается View.
 * @param {Object} [info.noevents] Кастомные события, на которые подписывается View.
 * @param {Object} [info.noevents.init] События, на которые надо подписаться при создании DOM-элемента.
 * @param {Object} [info.noevents.show] События, на которые надо подписаться при показе DOM-элемента.
 * @param {Function} [base=no.View] Базовый View для наследования
 * @return {Function} Созданный View.
 */
no.View.define = function(id, info, base) {
    if (id in _infos) {
        throw "View can't be redefined!";
    }

    info = info || {};

    var ctor = info.ctor || function() {};
    // Нужно унаследоваться от no.View и добавить в прототип info.methods.
    ctor = no.inherits(ctor, base || no.View, info.methods);

    info.models = info.models || [];
    info.events = info.events || {};
    info.noevents = info.noevents || {};

    // часть дополнительной обработки производится в no.View.info
    // т.о. получаем lazy-определение

    _infos[id] = info;
    _ctors[id] = ctor;

    return ctor;
};

no.View.info = function(id) {
    var info = _infos[id];
    // если есть декларация, но еще нет pNames, то надо завершить определение View
    if (info && !info.pNames) {
        var params = {};
        var models = info.models;
        for (var i = 0, l = models.length; i < l; i++) {
            var modelInfo = no.Model.info(models[i]);
            if (!modelInfo) {
                throw 'Model "' + models[i] + '" is not defined!';
            }
            no.extend( params, modelInfo.params );
        }
        if (info.params) {
            no.extend(params, info.params);
        }
        info.pNames = Object.keys(params);

        /**
         * События, которые надо повесить сразу при создании view
         * @type {Array}
         */
        info.createEvents = [];

        /**
         * События, которые вешаются на htmlinit, снимаются на htmldestroy
         * @type {Object}
         */
        info.initEvents = {
            'bind': [],
            'delegate': []
        };

        /**
         * События, которые вешаются на show, снимаются на hide
         * @type {Object}
         */
        info.showEvents = {
            'bind': [],
            'delegate': []
        };

        /**
         * Декларации подписок на кастомные события при создании View.
         * @type {Object}
         */
        info.initNoevents = {
            'global': [],
            'local': []
        };

        /**
         * Декларации подписок на кастомные события при показе View.
         * @type {Object}
         */
        info.showNoevents = {
            'global': [],
            'local': []
        };

        // парсим события View
        for (var eventDecl in info.events) {
            var declParts = eventDecl.split(' ');

            // первый элемент - событие
            var eventParts = declParts.shift().split('@');
            var when = eventParts.length > 1 ? eventParts.pop() : '';
            // нормализуем when
            when = when && (when === 'init' || when === 'show') ? when : '';

            var eventName = eventParts.join('@');

            // осталоное - селектор
            var eventSelector = declParts.join(' ');

            if (eventName) {
                var handler = info.events[eventDecl];
                var nativeEvent = no.V.DOM_EVENTS.indexOf(eventName) > -1;

                if (nativeEvent) {
                    var arr = [eventName, eventSelector, info.events[eventDecl]];

                    // глобальные селекторы всегда delegate
                    var globalSelector = eventSelector === 'window' || eventSelector === 'document';
                    // все события вешаем через .on(event, selector), кроме scroll, который .find(selector).on(scroll, handler)
                    var delegatedEvent = globalSelector || !(eventName === 'scroll' && eventSelector);

                    if (!when) {
                        when = globalSelector ? 'show' : 'init';
                    }

                    // info.initEvents.delegate.push(arr)
                    info[when + 'Events'][delegatedEvent ? 'delegate' : 'bind'].push(arr);

                } else {
                    when = when || 'init';

                    // событие тригерится при создании блока, поэтому вешать его надо сразу
                    if (eventName == 'init') {
                        info.createEvents.push([eventName, handler]);

                    } else {
                        // если есть селектор, то это локальное событие
                        if (eventSelector) {
                            info[when + 'Noevents'].local.push([eventName, handler]);

                        } else {
                            info[when + 'Noevents'].global.push([eventName, handler]);
                        }
                    }
                }
            }
        }

        // больше не нужны
        delete info.events;
    }
    return info;
};

//  ---------------------------------------------------------------------------------------------------------------  //
/**
 * Фабрика no.View
 * @param {String} id
 * @param {Object} params
 * @param {Boolean} [async=false]
 * @return {no.View}
 */
no.View.create = function(id, params, async) {
    var ctor = _ctors[id];
    if (!ctor) {
        throw 'no.View "' + id + '" is not declared!';
    }
    /**
     * @type {no.View}
     */
    var view = new ctor();
    view._init(id, params, async);

    return view;
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.View.prototype._getView = function(id) {
    return this.views[id];
};

no.View.prototype._addView = function(id, params, type) {
    var view = this._getView(id);
    if (!view) {
        if (type === no.L.BOX) {
            view = new no.Box(id, params);
        } else {
            view = no.View.create(id, params, type === no.L.ASYNC);
        }
        this.views[view.id] = view;
    }
    return view;
};

no.View.prototype._hide = function() {
    if ( this.isLoading() ) {
        return;
    }

    if (this._visible === true) {
        this._unbindEvents('show');
        this.node.className = this.node.className.replace(' ns-view-visible', '') + ' ns-view-hidden';
        this._visible = false;
        this.trigger('hide');
    }
};

/**
 * Показывает View
 * @private
 */
no.View.prototype._show = function() {
    if ( this.isLoading() ) {
        return;
    }
    // При создании блока у него this._visible === undefined.
    if (this._visible !== true) {
        this._bindEvents('show');
        this.node.className = this.node.className.replace(' ns-view-hidden', '') + ' ns-view-visible';
        this._visible = true;
        this.trigger('show');
    }
};

/**
 * Копирует массив деклараций событий и возвращает такой же массив, но забинженными на этот инстанс обработчиками.
 * @param {Array} events
 * @param {Number} handlerPos Позиция хендлера в массиве.
 * @return {Array} Копия events c забинженными обработчиками.
 * @private
 */
no.View.prototype._bindEventHandlers = function(events, handlerPos) {
    var bindedEvents = [];

    for (var i = 0, j = events.length; i < j; i++) {
        var event = events[i];
        var method = event[handlerPos];
        if (typeof method === 'string') {
            method = this[method];
        }

        // копируем события из info, чтобы не испортить оригинальные данные
        var eventCopy = [].concat(event);
        eventCopy[handlerPos] = method.bind(this);

        bindedEvents.push(eventCopy);
    }

    return bindedEvents;
};

/**
 * Возващает обработчики событий для View.
 * @param {String} type Тип обработчиков: 'init' или 'show'.
 * @return {Object}
 * @private
 */
no.View.prototype._getEvents = function(type) {
    // this._initEvents
    var eventProp = '_' + type + 'Events';

    if (!this[eventProp]) {
        var eventsInfo = this.info[type + 'Events'];
        var noeventsInfo = this.info[type + 'Noevents'];

        // копируем информацию из info в View и биндим обработчики на этот инстанс
        this[eventProp] = {
            'bind': this._bindEventHandlers(eventsInfo['bind'], 2),
            'delegate': this._bindEventHandlers(eventsInfo['delegate'], 2),

            'no-global': this._bindEventHandlers(noeventsInfo['global'], 1),
            'no-local': this._bindEventHandlers(noeventsInfo['local'], 1)
        }
    }
    return this[eventProp];
};

/**
 * Регистрирует обработчики событий после создания ноды.
 * @private
 */
no.View.prototype._bindEvents = function(type) {
    var $node = $(this.node);
    var i, j, event;
    var events = this._getEvents(type);

    // добавляем тип к namespace, чтобы при unbind не убить все события (и show и init)
    var eventNS = this._eventNS + '-' + type;

    var delegateEvents = events['delegate'];
    for (i = 0, j = delegateEvents.length; i < j; i++) {
        event = delegateEvents[i];

        // если надо переопределяем $target на глобальные объекты
        var $target = $node;
        if (event[0] === 'window') {
            $target = this._$document;

        } else if (event[0] === 'document') {
            $target = this._$window;
        }
        if (event[1]) { //selector
            $target.on(event[0] + eventNS, event[1], event[2]);
        } else {
            $target.on(event[0] + eventNS, event[2]);
        }
    }

    var bindEvents = events['bind'];
    for (i = 0, j = bindEvents.length; i < j; i++) {
        event = bindEvents[i];
        $node.find(event[1]).on(event[0] + eventNS, event[2]);
    }

    var localNoevents = events['no-local'];
    for (i = 0, j = localNoevents.length; i < j; i++) {
        event = localNoevents[i];
        this.on(event[0], event[1]);
    }

    var globalNoevents = events['no-global'];
    for (i = 0, j = globalNoevents.length; i < j; i++) {
        event = globalNoevents[i];
        no.events.on(event[0], event[1]);
    }
};

/**
 * Удаляет обработчики событий перед удалением ноды.
 * @private
 */
no.View.prototype._unbindEvents = function(type) {
    var $node = $(this.node);
    var i, j, event;

    // добавляем тип к namespace, чтобы при unbind не убить все события (и show и init)
    var eventNS = this._eventNS + '-' + type;
    var events = this._getEvents(type);

    $node.off(eventNS);
    this._$document.off(eventNS);
    this._$window.off(eventNS);

    var bindEvents = events['bind'];
    for (i = 0, j = bindEvents.length; i < j; i++) {
        event = bindEvents[i];
        $node.find(event[1]).off(eventNS);
    }

    var localNoevents = events['no-local'];
    for (i = 0, j = localNoevents.length; i < j; i++) {
        event = localNoevents[i];
        this.off(event[0], event[1]);
    }

    var globalNoevents = events['no-global'];
    for (i = 0, j = globalNoevents.length; i < j; i++) {
        event = globalNoevents[i];
        no.events.off(event[0], event[1]);
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.View.prototype.invalidate = function() {
    this.status = this.STATUS.INVALID;
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.View.prototype.isOk = function() {
    return (this.status === this.STATUS.OK);
};

no.View.prototype.isLoading = function() {
    return (this.status === this.STATUS.LOADING);
};

/**
 * Возвращает true, если блок валиден.
 * @return {Boolean}
 */
no.View.prototype.isValid = function() {
    return this.isOk() && this.isModelsValid(this.timestamp);
};

/**
 * Возвращает true, если все модели валидны.
 * @param {Number} [timestamp] Также проверяем, что кеш модели не свежее переданного timestamp.
 * @return {Boolean}
 */
no.View.prototype.isModelsValid = function(timestamp) {
    var models = this.models;
    for (var id in models) {
        var model = models[id];
        if (
            // модель не валидна
            !model.isValid() ||
            // или ее кеш более свежий
            (timestamp && model.timestamp > timestamp)
        ) {
            return false;
        }
    }

    return true;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Вызываем callback для всех подблоков.
no.View.prototype._apply = function(callback) {
    var views = this.views;
    for (var id in views) {
        callback(views[id], id);
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

/**
 * Рекурсивно проходимся по дереву блоков (построенному по layout) и выбираем новые блоки или
 * требующие перерисовки. Раскладываем их в две "кучки": sync и async.
 * @param updated
 * @param pageLayout
 * @param params
 * @return {*}
 */
no.View.prototype._getRequestViews = function(updated, pageLayout, params) {
    if (this.async) {
        var hasValidModels = this.isModelsValid();
        var hasValidStatus = this.isOk();
        if (hasValidModels && !hasValidStatus) {
            // если асинхронный блок имеет валидные модели, но невалидный статус - рисуем его
            updated.sync.push(this);

        } else if (!hasValidModels) {
            // если асинхронный блок имеет невалидные модели, то его не надо рисовать
            updated.async.push(this);
            // прекращаем обработку
            return updated;
        }
    } else if (!this.isValid()) {
        // если обычный блок не валиден
        updated.sync.push(this);
    }

    // Если views еще не определены (первая отрисовка)
    if (!this.views) {
        this.views = {};
        // Создаем подблоки
        for (var view_id in pageLayout) {
            this._addView(view_id, params, pageLayout[view_id].type);
        }
    }

    this._apply(function(view, id) {
        view._getRequestViews(updated, pageLayout[id].views, params);
    });

    return updated;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Строим дерево для шаблонизатора.
//
//  В tree.views будет дерево блоков, которые нужно сгенерить,
//  причем на верхнем уровне будут т.н. toplevel-блоки --
//  это невалидные блоки и выше их все блоки валидны.
//  В частности, это значит, что если блок невалидный, то он будет перерисован
//  со всеми своими подблоками.
//
//  В tree.models будут все модели, требуемые для этих блоков.
//
no.View.prototype._getUpdateTree = function(tree, layout, params) {
    if ( !this.isValid() ) {
        tree.views[this.id] = this._getViewTree(layout, params);
    } else {
        this._apply(function(view, id) {
            view._getUpdateTree(tree, layout[id].views, params);
        });
    }

    return tree;
};

/**
 * Строим дерево блоков.
 * @param layout
 * @param params
 * @return {Object}
 */
no.View.prototype._getViewTree = function(layout, params) {
    var tree = {
        async: false,
        // фейковое дерево, чтобы удобно матчится в yate
        tree: {},
        // всегда собираем данные, в том числе закешированные модели для async-view
        models: this._getModelsData(),
        //  добавляем собственные параметры блока
        //  NOTE @nop: Отличаются ли эти параметры от page.params?
        params: this.params,
        //  FIXME: Не должно ли оно приходить в параметрах Update'а?
        page: no.page.current,
        views: {}
    };

    // добавляем название view, чтобы можно было писать
    // match .view-name ns-view-content
    tree.tree[this.id] = true;

    //  Если это асинхронный блок и для него на самом деле нет еще всех моделей,
    //  помечаем его как асинхронный (false).
    //  Но может случиться так, что асинхронный запрос пришел раньше синхронного,
    //  тогда этот асинхронный блок будет нарисован вместе с остальными синхронными блоками.
    if ( this.async && !this.isModelsValid() ) {
        tree.async = true;
        return tree;
    }

    //  Это блок без подблоков и он не асинхронный.
    if (typeof layout !== 'object') {
        return true;
    }

    //  Собираем дерево рекурсивно из подблоков.
    this._apply(function(view, id) {
        tree.views[id] = view._getViewTree(layout[id].views, params);
    });

    return tree;
};

no.View.prototype._getModelsData = function() {
    var r = {};

    var models = this.models;
    for (var id in models) {
        var data = models[id].getData();
        if (data) {
            r[id] = data;
        }
    }

    return r;
};

no.View.prototype.getModel = function(id) {
    return this.models[id].getData();
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.View.prototype._getDescendants = function(views) {
    views.push(this);
    this._apply(function(view) {
        view._getDescendants(views);
    });

    return views;
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.View.prototype._setNode = function(node) {
    var STATUS = this.STATUS;
    if (node) {
        this.node = node;
        this.status = ( node.getAttribute('loading') ) ? STATUS.LOADING : STATUS.OK;
    } else {
        this.status = STATUS.NONE;
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Обновляем (если нужно) ноду блока.
no.View.prototype._updateHTML = function(node, layout, params, options) {
    var toplevel = options.toplevel;
    var async = options.async;

    var wasLoading = this.isLoading();

    var viewNode;
    //  Если блок уже валидный, ничего не делаем, идем ниже по дереву.
    if ( !this.isValid() ) {
        //  Ищем новую ноду блока.
        viewNode = no.byClass('ns-view-' + this.id, node)[0];
        if (viewNode) {
            //  toplevel-блок -- это невалидный блок, выше которого все блоки валидны.
            //  Для таких блоков нужно вставить их ноду в DOM, а все его подблоки
            //  автоматически попадут на нужное место.
            if (toplevel) {
                if (!wasLoading) {
                    this._unbindEvents('init');
                    this.trigger('htmldestroy');
                }

                //  Старая нода показывает место, где должен быть блок.
                //  Если старой ноды нет, то это блок, который вставляется в бокс.
                if (this.node) {
                    no.replaceNode(this.node, viewNode);
                }
                //  Все подблоки уже не toplevel.
                toplevel = false;
            }
            //  Запоминаем новую ноду.
            this._setNode(viewNode);

            if ( this.isOk() ) {
                this._bindEvents('init');
                this.trigger('htmlinit');
            }

            this.timestamp = +new Date();
        } else {
            //  FIXME: А что делать, если новой ноды не обнаружено?
        }
    }

    //  В асинхронном запросе вызываем onrepaint для блоков, которые были заглушкой.
    //  В синхронном запросе вызывает onrepaint для всех блоков.
    //  Кроме того, не вызываем onrepaint для все еще заглушек.
    if ( this.isOk() && ( (async && wasLoading) || !async) ) {
        this.trigger('repaint', params);
    }

    //  Т.к. мы, возможно, сделали replaceNode, то внутри node уже может не быть
    //  никаких подблоков. В этом случае, нужно брать viewNode.
    viewNode = viewNode || node;

    //  Рекурсивно идем вниз по дереву.
    this._apply(function(view, id) {
        view._updateHTML(viewNode, layout[id].views, params, {
            toplevel: toplevel,
            async: async
        });
    });
};


if (window['mocha']) {
    /**
     * Удаляет определение view.
     * Используется только в юнит-тестах.
     * @param {String} [id] ID view.
     */
    no.View.undefine = function(id) {
        if (id) {
            delete _ctors[id];
            delete _infos[id];
        } else {
            _ctors = {};
            _infos = {};
        }
    };

    no.View.privats = {
        _ctors: _ctors,
        _infos: _infos
    };
}

})();

