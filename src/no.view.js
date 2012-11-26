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

no.View.prototype._init = function(id, params) {
    this.id = id;
    this.params = params || {};

    this.info = no.View.info(id);

    this.key = no.View.getKey(id, params, this.info);

    //  Создаем нужные модели (или берем их из кэша, если они уже существуют).
    var model_ids = this.info.models;
    var models = this.models = {};
    for (var i = 0, l = model_ids.length; i < l; i++) {
        var model_id = model_ids[i];
        models[model_id] = no.Model.create(model_id, params);
    }

    //  Создаем подблоки.
    var view_ids = no.layout.view(id);
    var views = this.views = {};
    for (var view_id in view_ids) {
        if (view_ids[view_id] === 'box') {
            this._addBox(view_id, params);
        } else {
            this._addView(view_id, params);
        }
    }

    this.node = null;
    //  Варианты для status:
    //
    //    * none            --  у блок еще нет никакой ноды.
    //    * loading         --  у блока есть заглушка, данные для полноценного блока загружаются.
    //    * ok              --  все хорошо, нода блока построена и актуальна.
    //    * invalid         --  блока помечен как невалидный, при следующем апдейте он должен перерисоваться.
    //
    this.status = 'none';

    this.timestamp = 0;

    /**
     * jquery-namespace для событий.
     * @type {String}
     * @private
     */
    this._eventNS = '.no-view-' + this.id;

    this.oninit();
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
 * Определяет новый блок.
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
 * @param {Object} [info.methods] Методы, переопределяющие стандартные методы View. Если указан, то ctor не используется.
 * @param {Array} [info.models] Массив моделей, от которых зависит View.
 * @param {Object} [info.events] DOM-события, на которые подписывается View.
 * @param {Object} [info.noevents] Кастомные события, на которые подписывается View.
 * @param {Object} [info.noevents.init] События, на которые надо подписаться при создании DOM-элемента.
 * @param {Object} [info.noevents.show] События, на которые надо подписаться при показе DOM-элемента.
 * @param {Function} [ctor] Конструктор блока.
 */
no.View.define = function(id, info, ctor) {
    if (id in _infos) {
        throw "View can't be redefined!";
    }

    info = info || {};
    if (info.methods) {
        //  Нужно унаследоваться от no.View и добавить в прототип info.methods.
        ctor = no.inherits(function() {}, no.View, info.methods);
    } else {
        ctor = ctor || no.View;
    }

    info.models = info.models || [];
    info.events = info.events || {};
    info.noevents = info.noevents || {};

    // часть дополнительной обработки производится в no.View.info
    // т.о. получаем lazy-определение

    _infos[id] = info;
    _ctors[id] = ctor;
};

no.View.info = function(id) {
    var info = _infos[id];
    // если есть декларация, но еще нет pNames, то надо завершить определение View
    if (info && !info.pNames) {
        var params = {};
        var models = info.models;
        for (var i = 0, l = models.length; i < l; i++) {
            no.extend( params, no.Model.info( models[i] ).params );
        }
        if (info.params) {
            no.extend(params, info.params);
        }
        info.pNames = Object.keys(params);

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
         * @type {Array}
         */
        info.showEvents = [];

        // парсим события View
        for (var eventDecl in info.events) {
            var parts = eventDecl.split(' ');
            // первый элемент - событие
            var eventName = parts.shift();
            // осталоное - селектор
            var eventSelector = parts.join(' ');

            if (eventName) {
                var arr = [eventName, eventSelector, info.events[eventDecl]];
                // глобальные события и resize вешаем на show
                if (eventSelector === 'window' || eventSelector === 'document' || eventName === 'resize') {
                    info.showEvents.push(arr);

                } else if (eventName === 'scroll' && eventSelector) {
                    // bind-события могут быть только с селектором
                    // событие scroll не баблится, поэтому его надо вешать через $.find().on()
                    info.initEvents['bind'].push(arr);

                } else {
                    info.initEvents['delegate'].push(arr);
                }
            }
        }

        /**
         * Декларации подписок на кастомные события при создании View.
         * @type {Object}
         */
        info.initNoevents = parseNoeventsDeclaration(info.noevents.init);

        /**
         * Декларации подписок на кастомные события при показе View.
         * @type {Object}
         */
        info.showNoevents = parseNoeventsDeclaration(info.noevents.show);

        // больше не нужны
        delete info.events;
        delete info.noevents;
    }
    return info;
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.View.create = function(id, params) {
    var ctor = _ctors[id];
    var view = new ctor();
    view._init(id, params);

    return view;
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.View.prototype._getView = function(id, params) {
    var key = no.View.getKey(id, params);
    return this.views[key];
};

no.View.prototype._addView = function(id, params) {
    var view = this._getView(id, params);
    if (!view) {
        view = no.View.create(id, params);
        this.views[view.id] = view;
    }
    return view;
};

no.View.prototype._addBox = function(id, params) {
    var box = this._getView(id, params);
    if (!box) {
        box = new no.Box(id, params);
        this.views[box.id] = box;
    }
    return box;
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.View.prototype._hide = function() {
    if ( this.isLoading() ) {
        return;
    }

    if (this._visible === true) {
        this._unbindShowEvents();
        this.node.style.display = 'none';
        this._visible = false;
        this.onhide();
    }
};

//  При создании блока у него this._visible === undefined.
no.View.prototype._show = function() {
    if ( this.isLoading() ) {
        return;
    }

    if (this._visible !== true) {
        this._bindShowEvents();
        this.node.style.display = '';
        this._visible = true;
        this.onshow();
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

function log(s) {
    return function() {
        console.log(s, this.id);
    }
};

no.View.prototype.oninit = no.pe; // log('oninit');

//  FIXME: Пока что блоки никогда не уничтожаются,
//  поэтому этот метод не вызывается никогда.
/// no.View.prototype.ondestroy = no.pe; // log('ondestroy');

no.View.prototype.onhtmlinit = no.pe; // log('onhtmlinit');

no.View.prototype.onhtmldestroy = no.pe; // log('onhtmldestroy');

no.View.prototype.onshow = no.pe; // log('onshow');

no.View.prototype.onhide = no.pe; // log('onhide');

no.View.prototype.onrepaint = no.pe; // log('onrepaint');

//  ---------------------------------------------------------------------------------------------------------------  //

/**
 * Копирует массив деклараций событий и возвращает такой же массив, но забинженными на этот инстанс обработчиками.
 * @param {Array} events
 * @param {Number} handlerPos Позиция хендлера в массиве.
 * @return {Array} Копия events c забинженными обработчиками.
 * @private
 */
no.View.prototype._bindEventHandlers = function(events, handlerPos) {
    var bindedEvents = [].concat(events);

    for (var i = 0, j = bindedEvents.length; i < j; i++) {
        var event = bindedEvents[i];
        var method = event[handlerPos];
        if (typeof method === 'string') {
            method = this[method];
        }
        event[handlerPos] = method.bind(this);
    }

    return bindedEvents;
};

/**
 * Возващает обработчики событий, которые надо навесить после создания ноды.
 * @return {Array}
 * @private
 */
no.View.prototype._getInitEvents = function() {
    if (!this._initEvents) {
        var infoInitEvents = this.info.initEvents;
        var infoInitNoevents = this.info.initNoevents;

        // копируем информацию из info в View и биндим обработчики на этот инстанс
        this._initEvents = {
            'bind': this._bindEventHandlers(infoInitEvents['bind'], 2),
            'delegate': this._bindEventHandlers(infoInitEvents['delegate'], 2),

            'no-global': this._bindEventHandlers(infoInitNoevents['global'], 1),
            'no-local': this._bindEventHandlers(infoInitNoevents['local'], 1)
        }
    }
    return this._initEvents;
};

/**
 * Возващает обработчики событий, которые надо навесить после показа ноды.
 * @return {Array}
 * @private
 */
no.View.prototype._getShowEvents = function() {
    if (!this._showEvents) {
        var infoShowNoevents = this.info.showNoevents;
        // копируем информацию из info в View и биндим обработчики на этот инстанс
        this._showEvents = {
            'dom': this._bindEventHandlers(this.info.showEvents, 2),

            'no-global': this._bindEventHandlers(infoShowNoevents['global'], 1),
            'no-local': this._bindEventHandlers(infoShowNoevents['local'], 1)
        }
    }
    return this._showEvents;
};

/**
 * Регистрирует обработчики событий после создания ноды.
 * @private
 */
no.View.prototype._bindInitEvents = function() {
    var $node = $(this.node);
    var i, j, event;
    var initEvents = this._getInitEvents();

    var delegateEvents = initEvents['delegate'];
    for (i = 0, j = delegateEvents.length; i < j; i++) {
        event = delegateEvents[i];
        if (event[1]) { //selector
            $node.on(event[0] + this._eventNS, event[1], event[2]);
        } else {
            $node.on(event[0] + this._eventNS, event[2]);
        }
    }

    var bindEvents = initEvents['bind'];
    for (i = 0, j = bindEvents.length; i < j; i++) {
        event = bindEvents[i];
        $node.find(event[1]).on(event[0] + this._eventNS, event[2]);
    }

    var localNoevents = initEvents['no-local'];
    for (i = 0, j = localNoevents.length; i < j; i++) {
        event = localNoevents[i];
        this.on(event[0], event[1]);
    }

    var globalNoevents = initEvents['no-global'];
    for (i = 0, j = globalNoevents.length; i < j; i++) {
        event = globalNoevents[i];
        no.events.on(event[0], event[1]);
    }
};

/**
 * Удаляет обработчики событий перед удалением ноды.
 * @private
 */
no.View.prototype._unbindInitEvents = function() {
    var $node = $(this.node);
    var i, j, event;

    var initEvents = this._getInitEvents();
    $node.off(this._eventNS);

    var bindEvents = initEvents['bind'];
    for (i = 0, j = bindEvents.length; i < j; i++) {
        event = bindEvents[i];
        if (event[1]) { //selector
            $node.find(event[1]).off(this._eventNS);
        }
    }

    var localNoevents = initEvents['no-local'];
    for (i = 0, j = localNoevents.length; i < j; i++) {
        event = localNoevents[i];
        this.off(event[0], event[1]);
    }

    var globalNoevents = initEvents['no-global'];
    for (i = 0, j = globalNoevents.length; i < j; i++) {
        event = globalNoevents[i];
        no.events.off(event[0], event[1]);
    }
};

/**
 * Регистрирует обработчики событий после показа ноды.
 * @private
 */
no.View.prototype._bindShowEvents = function() {
    var i, j, event;
    var showEvents = this._getShowEvents();

    var domEvents = showEvents['dom'];
    for (i = 0, j = domEvents.length; i < j; i++) {
        event = domEvents[i];
        // event[1] - window или document, для них уже есть переменные в прототипе
        this['_$' + event[1]].on(event[0] + this._eventNS, event[2])
    }

    var localNoevents = showEvents['no-local'];
    for (i = 0, j = localNoevents.length; i < j; i++) {
        event = localNoevents[i];
        this.on(event[0], event[1]);
    }

    var globalNoevents = showEvents['no-global'];
    for (i = 0, j = globalNoevents.length; i < j; i++) {
        event = globalNoevents[i];
        no.events.on(event[0], event[1]);
    }
};

/**
 * Удаляет обработчики событий перед скрытия ноды.
 * @private
 */
no.View.prototype._unbindShowEvents = function() {
    // по массиву можно не ходить, просто анбиндим все по неймспейсу
    this._$document.off(this._eventNS);
    this._$window.off(this._eventNS);

    var i, j, event;
    var showEvents = this._getShowEvents();

    var localNoevents = showEvents['no-local'];
    for (i = 0, j = localNoevents.length; i < j; i++) {
        event = localNoevents[i];
        this.off(event[0], event[1]);
    }

    var globalNoevents = showEvents['no-global'];
    for (i = 0, j = globalNoevents.length; i < j; i++) {
        event = globalNoevents[i];
        no.events.off(event[0], event[1]);
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.View.prototype.invalidate = function() {
    this.status = 'invalid';
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.View.prototype.isOk = function() {
    return (this.status === 'ok');
};

no.View.prototype.isLoading = function() {
    return (this.status === 'loading');
};

/**
 * Возвращает true, если блок валиден.
 * @return {Boolean}
 */
no.View.prototype.isValid = function() {
    if ( !this.isOk() ) { return false; }

    return this.isModelsValid(this.timestamp);
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

//  Рекурсивно проходимся по дереву блоков (построенному по layout) и выбираем новые блоки или
//  требующие перерисовки. Раскладываем их в две "кучки": sync и async.
no.View.prototype._getRequestViews = function(updated, layout, params) {
    if  ( !this.isValid() ) {
        if (layout === false) {
            updated.async.push(this);
        } else {
            updated.sync.push(this);
        }
    }

    this._apply(function(view, id) {
        view._getRequestViews(updated, layout[id], params);
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
        tree.views[this.id] = this._getViewTree(tree.models, layout, params);
    } else {
        this._apply(function(view, id) {
            view._getUpdateTree(tree, layout[id], params);
        });
    }

    return tree;
};

//  Строим дерево блоков, попутно собираем все нужные для него модели.
no.View.prototype._getViewTree = function(models, layout, params) {
    //  Если это асинхронный блок и для него на самом деле нет еще всех моделей,
    //  помечаем его как асинхронный (false).
    //  Но может случиться так, что асинхронный запрос пришел раньше синхронного,
    //  тогда этот асинхронный блок будет нарисован вместе с остальными синхронными блоками.
    if ( layout === false && !this.isModelsValid() ) {
        return false;
    }

    //  Собираем все нужные модели.
    no.extend( models, this._getModelsData() );

    //  Это блок без подблоков и он не асинхронный.
    if (typeof layout !== 'object') {
        return true;
    }

    //  Собираем дерево рекурсивно из подблоков.
    var tree = {};
    this._apply(function(view, id) {
        tree[id] = view._getViewTree(models, layout[id], params);
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
    if (node) {
        this.node = node;
        this.status = ( node.getAttribute('loading') ) ? 'loading' : 'ok';
    } else {
        this.status = 'none';
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
        viewNode = no.byClass('view-' + this.id, node)[0];
        if (viewNode) {
            //  toplevel-блок -- это невалидный блок, выше которого все блоки валидны.
            //  Для таких блоков нужно вставить их ноду в DOM, а все его подблоки
            //  автоматически попадут на нужное место.
            if (toplevel) {
                if (!wasLoading) {
                    this._unbindInitEvents();
                    this.onhtmldestroy();
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
                this._bindInitEvents();
                this.onhtmlinit();
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
        this.onrepaint();
    }

    //  Т.к. мы, возможно, сделали replaceNode, то внутри node уже может не быть
    //  никаких подблоков. В этом случае, нужно брать viewNode.
    viewNode = viewNode || node;

    //  Рекурсивно идем вниз по дереву.
    this._apply(function(view, id) {
        view._updateHTML(viewNode, layout[id], params, {
            toplevel: toplevel,
            async: async
        });
    });
};

//  ---------------------------------------------------------------------------------------------------------------  //

/**
 * Парсит декларации кастомных событий View.
 * @param {Object} events
 * @return {Object}
 */
function parseNoeventsDeclaration(events) {
    var result = {
        'global': [],
        'local': []
    };

    if (events) {
        for (var event in events) {
            var handler = events[event];
            var parts = event.split(' ');
            if (parts[0] === '*') {
                parts.shift();
                result.global.push([parts.join(' '), handler]);

            } else {
                result.local.push([event, handler]);
            }
        }
    }

    return result;
}

})();

