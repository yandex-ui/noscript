(function() {

//  ---------------------------------------------------------------------------------------------------------------  //
//  ns.View
//  ---------------------------------------------------------------------------------------------------------------  //

/**
 * Создает View. Конструктор не используется напрямую, View создаются через ns.View.create.
 * @class Класс, реализующий View
 * @see http://github.com/pasaran/noscript/wiki/ns.View
 * @constructor
 * @mixes no.Events
 */
ns.View = function() {};

//  ---------------------------------------------------------------------------------------------------------------  //

no.extend(ns.View.prototype, no.Events);

//  ---------------------------------------------------------------------------------------------------------------  //

/**
 * @see ns.V.STATUS
 * @enum {Number}
 * @borrows ns.V.STATUS as ns.View.prototype.STATUS
 */
ns.View.prototype.STATUS = ns.V.STATUS;

/**
 * Закешированный $(document)
 * @type {jQuery}
 * @private
 */
ns.View.prototype._$document = $(document);

/**
 * Закешированный $(window)
 * @type {jQuery}
 * @private
 */
ns.View.prototype._$window = $(window);

ns.View.prototype._init = function(id, params, async) {
    this.id = id;

    this._onModelChangeBinded = this._onModelChange.bind(this);

    /**
     * Флаг того, что view может быть асинхронным.
     * Факт того, что сейчас view находится в асинхронном состояии опрделяться this.status и this.asyncState
     * @type {Boolean}
     */
    this.async = async;

    this.info = ns.View.info(id);

    no.extend(this, ns.View.getKeyAndParams(this.id, params || {}, this.info));

    //  Создаем нужные модели (или берем их из кэша, если они уже существуют).
    var model_ids = this.info.models;
    var models = this.models = {};
    for (var modelI = 0, l = model_ids.length; modelI < l; modelI++) {
        var model_id = model_ids[modelI];
        models[model_id] = ns.Model.create(model_id, this.params);
    }

    this.views = null;
    this.node = null;

    /**
     * Статус View.
     * @see ns.V.STATUS
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

    this.trigger('ns-init');
};

//  ---------------------------------------------------------------------------------------------------------------  //

ns.View.getKey = function(id, params, info) {
    return this.getKeyAndParams(id, params, info).key;
};

/**
 * Возвращает в объекта ключ и параметры с учётом rewriteParamsOnInit
 * В этом методе собрана вся логика рерайтов параметров при создании view
 * @return Object
 */
ns.View.getKeyAndParams = function(id, params, info) {
    //  Ключ можно вычислить даже для неопределенных view,
    //  в частности, для боксов.
    info = info || ns.View.info(id) || {};

    if ('function' === typeof info.rewriteParamsOnInit) {
        // если для view определен метод rewriteParamsOnInit и он вернул объект,
        // то перепишем параметры
        params = info.rewriteParamsOnInit(no.extend({}, params)) || params;
    }

    var key = 'view=' + id;

    var pNames = info.pNames || [];
    for (var i = 0, l = pNames.length; i < l; i++) {
        var pName = pNames[i];
        var pValue = params[pName];
        if (pValue != null) {
            key += '&' + pName + '=' + pValue;
        }
    }

    return {
        params: params, // параметры с учётом rewrite
        key: key        // ключ с учётом правильных параметров
    };
};

//  ---------------------------------------------------------------------------------------------------------------  //

var _infos = {};
var _ctors = {};

/**
 * Определяет новый View.
 * @description
 * no.events представляет из себя объект {"eventDecl1": "handler1", "eventDecl2": "handler2"}.
 * "eventDecl" записывается в виде "eventName [ selector ]".
 * "selector" опционален, если его нет, то события регистрируется на ноду View.
 * "handler" может быть строка (тогда она заменится на метод прототипа) или функция.
 * Все хендлеры биндятся на экземпляр View.
 * Разделение на типы событий происходит автоматически по следующим правилам (в порядке приоритета):
 *   - если selector === "window" || selector == "document", то обработчик регистрируется по событию show
 *   - если eventName === "resize", то обработчик регистрируется по событию show
 *   - если eventName === "scroll", то обработчик регистрируется по событию htmlinit с помощью $viewNode.find(selector).on(eventName, handler)
 *   - иначе обработчик регистрируется по событию htmlinit с помощью $viewNode.on(eventName, selector, handler)
 * @param {String} id Название View.
 * @param {Object} [info={}] Декларация View.
 * @param {Function} [info.ctor] Конструтор.
 * @param {Object} [info.methods] Методы, переопределяющие стандартные методы View.
 * @param {Array} [info.models] Массив моделей, от которых зависит View.
 * @param {Object} [info.events] DOM-события, на которые подписывается View.
 * @param {Object} [info.noevents] Кастомные события, на которые подписывается View.
 * @param {Object} [info.noevents.init] События, на которые надо подписаться при создании DOM-элемента.
 * @param {Object} [info.noevents.show] События, на которые надо подписаться при показе DOM-элемента.
 * @param {Function} [base=ns.View] Базовый View для наследования
 * @return {Function} Созданный View.
 */
ns.View.define = function(id, info, base) {
    if (id in _infos) {
        throw new Error("[ns.View] Can't redefine '" + id + "'");
    }

    info = info || {};

    var ctor = info.ctor || function() {};
    // Нужно унаследоваться от ns.View и добавить в прототип info.methods.
    ctor = no.inherit(ctor, base || ns.View, info.methods);

    info.models = info.models || [];
    info.events = info.events || {};
    info.noevents = info.noevents || {};

    // часть дополнительной обработки производится в ns.View.info
    // т.о. получаем lazy-определение

    _infos[id] = info;
    _ctors[id] = ctor;

    return ctor;
};

ns.View.info = function(id) {
    var info = _infos[id];
    // если есть декларация, но еще нет pNames, то надо завершить определение View
    if (info && !info.pNames) {
        var params = {};
        var models = info.models;
        for (var i = 0, l = models.length; i < l; i++) {
            var modelInfo = ns.Model.info(models[i]);
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

            // остальное - селектор
            var eventSelector = declParts.join(' ');

            if (eventName) {
                var handler = info.events[eventDecl];
                var nativeEvent = ns.V.DOM_EVENTS.indexOf(eventName) > -1;

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

                    // событие init тригерится при создании блока, поэтому вешать его надо сразу
                    // событие async тригерится до всего, его тоже надо вешать
                    if (eventName == 'ns-init' || eventName == 'ns-async') {
                        info.createEvents.push([eventName, handler]);

                    } else {
                        // к View нельзя получить доступ, поэтому локальными могут быть только встроенные ns-* события
                        if (ns.V.NS_EVENTS.indexOf(eventName) > -1) {
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
 * Фабрика ns.View
 * @param {String} id ID view.
 * @param {Object} [params] Параметры view.
 * @param {Boolean} [async=false] Может ли view бы асинхронным.
 * @return {ns.View}
 */
ns.View.create = function(id, params, async) {
    var Ctor = _ctors[id];
    if (!Ctor) {
        throw new Error('[ns.View] "' + id + '" is not defined');
    }
    /**
     * @type {ns.View}
     */
    var view = new Ctor();
    view._init(id, params, async);

    return view;
};

//  ---------------------------------------------------------------------------------------------------------------  //

ns.View.prototype._getView = function(id) {
    return this.views[id];
};

ns.View.prototype._addView = function(id, params, type) {
    var view = this._getView(id);
    if (!view) {
        if (type === ns.L.BOX) {
            view = new ns.Box(id, params);
        } else {
            view = ns.View.create(id, params, type === ns.L.ASYNC);
        }
        this.views[view.id] = view;
    }
    return view;
};

/**
 * Обработчик htmldestroy
 * @param {Array} [events] Массив событий.
 * @private
 */
ns.View.prototype._htmldestroy = function(events) {
    this._unbindEvents('init');
    events.push(this);
};

/**
 * Обработчик htmlinit
 * @param {Array} [events] Массив событий.
 * @private
 */
ns.View.prototype._htmlinit = function(events) {
    this._bindEvents('init');
    events.push(this);
};

/**
 * Скрывает view
 * @param {Array} [events] Массив событий.
 * @return {Boolean}
 * @private
 */
ns.View.prototype._hide = function(events) {
    if (!this.isLoading() && this._visible === true) {
        this._unbindModels();
        this._unbindEvents('show');
        this.node.className = this.node.className.replace(' ns-view-visible', '') + ' ns-view-hidden';
        this._visible = false;
        if (events) {
            events.push(this);
        }
        return true;
    }

    return false;
};

/**
 * Показывает View
 * @param {Array} [events] Массив событий.
 * @private
 * @return {Boolean}
 */
ns.View.prototype._show = function(events) {
    // При создании блока у него this._visible === undefined.
    if (!this.isLoading() && this._visible !== true) {
        this._bindModels();
        this._bindEvents('show');
        this.node.className = this.node.className.replace(' ns-view-hidden', '') + ' ns-view-visible';
        this._visible = true;
        if (events) {
            events.push(this);
        }
        return true;
    }

    return false;
};

/**
 * Обработчик изменений моделей.
 * @private
 */
ns.View.prototype._onModelChange = function() {
    ns.page.go();
};

/**
 * Биндится на изменение моделей.
 * @private
 */
ns.View.prototype._bindModels = function() {
    for (var id in this.models) {
        var model = this.models[id];
        //TODO: namespace бы пригодился!
        model.on('changed', this._onModelChangeBinded);
    }
};

/**
 * Анбиндится на изменение моделей.
 * @private
 */
ns.View.prototype._unbindModels = function() {
    for (var id in this.models) {
        var model = this.models[id];
        //TODO: namespace бы пригодился!
        model.off('changed', this._onModelChangeBinded);
    }
};

/**
 * Копирует массив деклараций событий и возвращает такой же массив, но с забинженными на этот инстанс обработчиками.
 * @param {Array} events
 * @param {Number} handlerPos Позиция хендлера в массиве.
 * @return {Array} Копия events c забинженными обработчиками.
 * @private
 */
ns.View.prototype._bindEventHandlers = function(events, handlerPos) {
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
ns.View.prototype._getEvents = function(type) {
    // this._initEvents
    var eventProp = '_' + type + 'Events';

    if (!this[eventProp]) {
        var eventsInfo = this.info[type + 'Events'];
        var noeventsInfo = this.info[type + 'Noevents'];

        // копируем информацию из info в View и биндим обработчики на этот инстанс
        this[eventProp] = {
            'bind': this._bindEventHandlers(eventsInfo['bind'], 2),
            'delegate': this._bindEventHandlers(eventsInfo['delegate'], 2),

            'ns-global': this._bindEventHandlers(noeventsInfo['global'], 1),
            'ns-local': this._bindEventHandlers(noeventsInfo['local'], 1)
        };
    }
    return this[eventProp];
};

/**
 * Регистрирует обработчики событий после создания ноды.
 * @private
 */
ns.View.prototype._bindEvents = function(type) {
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
            $target = this._$window;

        } else if (event[0] === 'document') {
            $target = this._$document;
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

    var localNoevents = events['ns-local'];
    for (i = 0, j = localNoevents.length; i < j; i++) {
        event = localNoevents[i];
        this.on(event[0], event[1]);
    }

    var globalNoevents = events['ns-global'];
    for (i = 0, j = globalNoevents.length; i < j; i++) {
        event = globalNoevents[i];
        no.events.on(event[0], event[1]);
    }
};

/**
 * Удаляет обработчики событий перед удалением ноды.
 * @private
 */
ns.View.prototype._unbindEvents = function(type) {
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

    var localNoevents = events['ns-local'];
    for (i = 0, j = localNoevents.length; i < j; i++) {
        event = localNoevents[i];
        this.off(event[0], event[1]);
    }

    var globalNoevents = events['ns-global'];
    for (i = 0, j = globalNoevents.length; i < j; i++) {
        event = globalNoevents[i];
        no.events.off(event[0], event[1]);
    }
};

/**
 * Инвалидует себя и своих потомков.
 */
ns.View.prototype.invalidate = function() {
    // рекурсивно инвалидируем себя и потомков
    var views = this._getDescendants();
    for (var i = 0, j = views.length; i < j; i++) {
        views[i].status = this.STATUS.INVALID;
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

ns.View.prototype.isOk = function() {
    return (this.status === this.STATUS.OK);
};

ns.View.prototype.isLoading = function() {
    return (this.status === this.STATUS.LOADING);
};

/**
 * Возвращает true, если блок валиден.
 * @return {Boolean}
 */
ns.View.prototype.isValid = function() {
    return this.isOk() && this.isModelsValid(this.timestamp);
};

/**
 * Возвращает true, если все модели валидны.
 * @param {Number} [timestamp] Также проверяем, что кеш модели не свежее переданного timestamp.
 * @return {Boolean}
 */
ns.View.prototype.isModelsValid = function(timestamp) {
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
ns.View.prototype._apply = function(callback) {
    var views = this.views;
    for (var id in views) {
        callback(views[id], id);
        // @chestozo: а не надо тут вызвать: views[id]._apply(callback) ?
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
ns.View.prototype._getRequestViews = function(updated, pageLayout, params) {
    /**
     * Флаг, означающий, что view грузится асинхронно.
     * @type {Boolean}
     */
    this.asyncState = false;

    if (this.async) {
        var hasValidModels = this.isModelsValid();
        var hasValidStatus = this.isOk();
        if (hasValidModels && !hasValidStatus) {
            // если асинхронный блок имеет валидные модели, но невалидный статус - рисуем его синхронно
            updated.sync.push(this);

        } else if (!hasValidModels) {
            this.asyncState = true;
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
ns.View.prototype._getUpdateTree = function(tree, layout, params) {
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
ns.View.prototype._getViewTree = function(layout, params) {
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
        page: ns.page.current,
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

ns.View.prototype._getModelsData = function() {
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

ns.View.prototype.getModel = function(id) {
    return this.models[id].getData();
};

//  Быстро что-нибудь сгенерить из данных блока.
//  Можно передать моду и дополнительный объект,
//  который попадет в /.extra:
//
//      block.tmpl()
//      block.tmpl('mode')
//      block.tmpl({ ... })
//      block.tmpl('mode', { ... })
//
ns.View.prototype.tmpl = function(mode, extra) {
    switch (arguments.length) {
        case 0:
            mode = '';
            break;
        case 1:
            if (typeof mode === 'object') {
                extra = mode;
                mode = '';
            }
    }

    var tree = {
        models: this._getModelsData(),
        page: ns.page.current
    };

    if (extra) {
        tree.extra = extra;
    }

    return ns.tmpl(tree, mode);
};

/**
 * Возвращает массив всех вложенных view, включая себя
 * @param {Array} [views=[]] Начальный массив.
 * @return {Array}
 * @private
 */
ns.View.prototype._getDescendants = function(views) {
    views = views || [];
    views.push(this);
    this._apply(function(view) {
        view._getDescendants(views);
    });

    return views;
};

//  ---------------------------------------------------------------------------------------------------------------  //

ns.View.prototype._setNode = function(node) {
    var STATUS = this.STATUS;
    if (node) {
        this.node = node;
        this.status = this.asyncState ? STATUS.LOADING : STATUS.OK;
    } else {
        this.status = STATUS.NONE;
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Обновляем (если нужно) ноду блока.
ns.View.prototype._updateHTML = function(node, layout, params, options, events) {

    // при обработке toplevel-view надо скопировать первоначальные options
    // инчае, при обновлении параллельных веток дерева, toplevel оказажется только первая
    // и, соответственно, DOM-надо обновиться только у нее
    // {
    //   "my-root-view1": {/* tree 1 */},
    //   "my-root-view2": {/* tree 2 */}
    // }
    var options_next;
    if (options.toplevel) {
        options_next = no.extend({}, options);

    } else {
        options_next = options;
    }

    // для валидных view при втором проходе (когда отрисовываются asynс-view) не надо второй раз кидать repaint
    var generateRepaintEvent = !options.async || !this.isValid();

    var viewNode;
    //  Если блок уже валидный, ничего не делаем, идем ниже по дереву.
    if ( !this.isValid() ) {
        //  Ищем новую ноду блока.
        viewNode = ns.byClass('ns-view-' + this.id, node)[0];
        if (viewNode) {
            //  toplevel-блок -- это невалидный блок, выше которого все блоки валидны.
            //  Для таких блоков нужно вставить их ноду в DOM, а все его подблоки
            //  автоматически попадут на нужное место.
            if (options.toplevel) {
                //  Старая нода показывает место, где должен быть блок.
                //  Если старой ноды нет, то это блок, который вставляется в бокс.
                if (this.node) {
                    ns.replaceNode(this.node, viewNode);
                    options_next.parent_added = true;
                }
                //  Все подблоки ниже уже не toplevel.
                options_next.toplevel = false;
            }
            //  вызываем htmldestory только если нода была заменена
            if (this.node && !this.isLoading()) {
                this._hide(events['ns-hide']);
                this._htmldestroy(events['ns-htmldestroy']);
            }

            //  новая нода должна в любом случае попасть в DOM
            if (this.node && !options.parent_added && !options_next.parent_added) {
                ns.replaceNode(this.node, viewNode);
            }

            //  Запоминаем новую ноду.
            this._setNode(viewNode);

            if ( this.isOk() ) {
                this._htmlinit(events['ns-htmlinit']);

            } else if (this.isLoading()) {
                // В асинхронном запросе вызываем async для view, которые являются заглушкой.
                events['ns-async'].push(this);
            }

            this.timestamp = +new Date();
        } else {
            throw new Error("[ns.View] Can't find node for '" + this.id + "'");
        }
    }

    // Если view валидный и не в async-режиме, то вызывается show и repaint
    if ( generateRepaintEvent && this.isOk() ) {
        // событие show будет вызвано, если у view поменяется this._visible
        this._show(events['ns-show']);
        events['ns-repaint'].push(this);
    }

    //  Т.к. мы, возможно, сделали replaceNode, то внутри node уже может не быть
    //  никаких подблоков. В этом случае, нужно брать viewNode.
    viewNode = viewNode || node;

    //  Рекурсивно идем вниз по дереву.
    this._apply(function(view, id) {
        view._updateHTML(viewNode, layout[id].views, params, options_next, events);
    });
};


if (window['mocha']) {
    /**
     * Удаляет определение view.
     * Используется только в юнит-тестах.
     * @param {String} [id] ID view.
     */
    ns.View.undefine = function(id) {
        if (id) {
            delete _ctors[id];
            delete _infos[id];
        } else {
            _ctors = {};
            _infos = {};
        }
    };

    ns.View.privats = {
        _ctors: _ctors,
        _infos: _infos
    };
}

})();

