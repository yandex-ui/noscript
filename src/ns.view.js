(function() {

    /**
     * Uniq View ID counter
     * @type {number}
     */
    var VIEW_ID = 0;

    /**
     * Создает View. Конструктор не используется напрямую, View создаются через ns.View.create.
     * @classdesc Класс, реализующий View
     * @tutorial ns.view
     * @tutorial ns.view.yate
     * @constructor
     * @mixes ns.Events
     */
    ns.View = function() {};
    no.extend(ns.View.prototype, ns.Events);

    /**
     * @see ns.V.STATUS
     * @enum {ns.V.STATUS}
     */
    ns.View.prototype.STATUS = ns.V.STATUS;

    /**
     * Закешированный $(document)
     * @type {jQuery}
     * @private
     */
    ns.View.prototype._$document = ('undefined' === typeof document) ? null : $(document);

    /**
     * Закешированный $(window)
     * @type {jQuery}
     * @private
     */
    ns.View.prototype._$window = ('undefined' === typeof window) ? null : $(window);

    /**
     * Уникальный ключ вида
     * @type {string}
     */
    ns.View.prototype.key = null;

    /**
     * Собственные параметры вида, с которыми он был создан
     * @type {object}
     */
    ns.View.prototype.params = null;

    /**
     * Собственная нода вида
     * @type {HTMLElement}
     */
    ns.View.prototype.node = null;

    /**
     * Собственная нода вида
     * @type {jQuery}
     */
    ns.View.prototype.$node = null;

    /**
     * Дочерние виды
     * @type {object.<string, ns.View>}
     * @private
     */
    ns.View.prototype.views = null;

    /**
     * Инициализирует экземпляр вида
     * @param {string} id
     * @param {object} params
     * @param {boolean} async
     * @private
     */
    ns.View.prototype._init = function(id, params, async) {
        this.id = id;

        /**
         * Флаг того, что view может быть асинхронным.
         * Факт того, что сейчас view находится в асинхронном состоянии определяется this.status и this.asyncState
         * @type {boolean}
         */
        this.async = async;

        this.info = ns.View.info(id);

        no.extend(this, ns.View.getKeyAndParams(this.id, params || {}, this.info));

        this._initModels();

        /**
         * Save models version to track changes.
         * @type {object}
         * @private
         */
        this._modelsVersions = {};

        /**
         * Обработчики событий моделей
         * @type {object}
         * @private
         */
        this._modelsHandlers = {};

        this.views = {};

        /**
         * Статус View.
         * @type {ns.V.STATUS}
         * @private
         */
        this.status = this.STATUS.NONE;

        /**
         * Uniq View ID
         * @type {number}
         * @private
         */
        this._uniqID = VIEW_ID++;

        /**
         * Uniq namespace for events so view can bind/unbind events properly.
         * @type {string}
         * @private
         */
        this._eventNS = '.ns-view-' + this.id + '-' + this._uniqID;

        // события, которые надо забиндить сразу при создании блока
        this._bindCreateEvents();

        this.trigger('ns-view-init');
    };

    /**
     *
     * @private
     */
    ns.View.prototype._initModels = function() {
        this.models = {};
        this._modelsHandlers = {};

        // Создаём модели или берем их из кэша, если они уже есть
        for (var id in this.info.models) {
            if (!this.models[id]) {
                var model = ns.Model.get(id, this.params);
                this.models[id] = model;
                this._modelsHandlers[model.key] = {};
            }
        }
    };

    /**
     *
     * @param {string} id
     * @returns {ns.View}
     * @private
     */
    ns.View.prototype._getView = function(id) {
        return this.views[id];
    };

    /**
     *
     * @param {string} id
     * @param {object} params
     * @param {ns.L} type
     * @returns {*}
     * @private
     */
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
     * @protected
     */
    ns.View.prototype._htmldestroy = function(events) {
        this._unbindEvents('init');
        events.push(this);
    };

    /**
     * Обработчик htmlinit
     * @param {array} [events] Массив событий.
     * @protected
     */
    ns.View.prototype._htmlinit = function(events) {
        this._bindEvents('init');
        events.push(this);
    };

    /**
     * Скрывает view
     * @param {array} [events] Массив событий.
     * @returns {boolean}
     * @protected
     */
    ns.View.prototype._hide = function(events) {
        if (!this.isLoading() && this._visible === true) {

            // FIXME если unbind-ить view от моделей - view не invalidate-ится и не будет перерисовано.
            // https://github.com/yandex-ui/noscript/pull/192#issuecomment-33148362
            // Написал тест кейс, чтобы это опять не сломать.
            // this._unbindModels();

            this._unbindEvents('show');
            this._hideNode();
            this._visible = false;
            if (events) {
                events.push(this);
            }
            return true;

        } else if (this.isLoading() && this._visible !== false) {
            // Случай для асинхронных видов, которые отрендерили в состоянии async,
            // но `_show` для них не выполнялся. Это происходит, например, при
            // быстрой навигации по интерфейсу.
            this._hideNode();
            this._visible = false;

            // Чтобы не триггерились события (см ns.box).
            return false;
        }

        return false;
    };

    /**
     * @private
     */
    ns.View.prototype._hideNode = function() {
        this.node.className = this.node.className.replace(' ns-view-visible', '') + ' ns-view-hidden';
    };

    /**
     * Показывает View
     * @param {array} [events] Массив событий.
     * @protected
     * @returns {boolean}
     */
    ns.View.prototype._show = function(events) {
        // При создании блока у него this._visible === undefined.
        if (!this.isLoading() && this._visible !== true) {
            //  FIXME: Почему это делается на show?
            //  chestozo: думаю, потому что события от моделей вызывают перерисовку.
            //  Если view скрыто - перерисоввывать ничего не надо.
            //  NOTE: вначале делаем _unbindModels, чтобы не подписываться дважды.
            this._unbindModels();
            this._bindModels();
            this._bindEvents('show');
            this._showNode();
            this._visible = true;
            if (events) {
                events.push(this);
            }
            return true;
        }

        return false;
    };

    /**
     * @private
     */
    ns.View.prototype._showNode = function() {
        this.node.className = this.node.className.replace(' ns-view-hidden', '') + ' ns-view-visible';
    };

    /**
     * @private
     */
    ns.View.prototype._bindModels = function() {
        var models = this.models;
        var decls = this.info.models;

        for (var idModel in models) {
            var model = models[idModel];

            var decl = decls[idModel];
            for (var eventName in decl) {
                var handlerName = decl[eventName];
                var handler = this[handlerName] || decl[eventName];
                if ('function' === typeof handler) {
                    this._bindModel(model, eventName,
                        this._invokeModelHandler.bind(this, handler)
                    );
                }
            }
        }
    };

    /**
     * Вызывает обработчик события модели
     * @param {function} handler
     * @private
     */
    ns.View.prototype._invokeModelHandler = function(handler) {
        this._saveModelsVersions();
        return handler.apply(this, Array.prototype.slice.call(arguments, 1));
    };

    /**
     * Подписывает обработчик handler на событие eventName модели Model
     * @param {ns.Model} model
     * @param {string} eventName
     * @param {function} handler
     * @private
     */
    ns.View.prototype._bindModel = function(model, eventName, handler) {
        model.on(eventName, handler);
        this._modelsHandlers[model.key] = handler;
    };

    /**
     * Отписываемся от изменений моделей.
     * @private
     */
    ns.View.prototype._unbindModels = function() {
        var models = this.models;
        for (var model_id in models) {
            var model = models[model_id];
            var events = this._modelsHandlers[model.key];

            for (var eventName in events) {
                model.off(eventName, events[eventName]);
            }

            delete this._modelsHandlers[model.key];
        }
    };

    /**
     * Returns function or method from prototype.
     * @param {String|Function} fn Function or method name from prototype.
     * @returns {Function}
     * @private
     */
    ns.View.prototype._prepareCallback = function(fn) {
        if (typeof fn === 'string') {
            var method = this[fn];
            ns.assert(method, 'ns.View', "Can't find method '%s' in '%s'", fn, this.id);
            return method;
        }

        return fn;
    };

    /**
     * Копирует массив деклараций событий и возвращает такой же массив, но с забинженными на этот инстанс обработчиками.
     * @param {Array} events
     * @param {number} handlerPos Позиция хендлера в массиве.
     * @returns {Array} Копия events c забинженными обработчиками.
     * @private
     */
    ns.View.prototype._bindEventHandlers = function(events, handlerPos) {
        var bindedEvents = [];

        for (var i = 0, j = events.length; i < j; i++) {
            var event = events[i];

            // копируем события из info, чтобы не испортить оригинальные данные
            var eventCopy = [].concat(event);
            eventCopy[handlerPos] = this._prepareCallback(event[handlerPos]).bind(this);

            bindedEvents.push(eventCopy);
        }

        return bindedEvents;
    };

    /**
     * Возващает обработчики событий для View.
     * @param {string} type Тип обработчиков: 'init' или 'show'.
     * @returns {object}
     * @private
     */
    ns.View.prototype._getEvents = function(type) {
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
        var $node = this.$node;
        var i;
        var j;
        var event;
        var events = this._getEvents(type);

        // добавляем тип к namespace, чтобы при unbind не убить все события (и show и init)
        var eventNS = this._eventNS + '-' + type;

        var delegateEvents = events['delegate'];
        for (i = 0, j = delegateEvents.length; i < j; i++) {
            event = delegateEvents[i];

            if (event[1] === 'window' || event[1] === 'document') {
                // this._$window
                // this._$document
                this['_$' + event[1]].on(event[0] + eventNS, event[2]);

            } else {

                if (event[1]) { //selector
                    $node.on(event[0] + eventNS, event[1], event[2]);
                } else {
                    $node.on(event[0] + eventNS, event[2]);
                }
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
            ns.events.on(event[0], event[1]);
        }
    };

    /**
     *
     * @private
     */
    ns.View.prototype._bindCreateEvents = function() {
        for (var i = 0, j = this.info.createEvents.length; i < j; i++) {
            var event = this.info.createEvents[i];
            this.on(event[0], this._prepareCallback(event[1]));
        }
    };

    /**
     * Удаляет обработчики событий перед удалением ноды.
     * @private
     */
    ns.View.prototype._unbindEvents = function(type) {
        var $node = this.$node;
        var i;
        var j;
        var event;

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
            ns.events.off(event[0], event[1]);
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

    /**
     *
     * @returns {boolean}
     */
    ns.View.prototype.isOk = function() {
        return (this.status === this.STATUS.OK);
    };

    /**
     *
     * @returns {boolean}
     */
    ns.View.prototype.isLoading = function() {
        return (this.status === this.STATUS.LOADING);
    };

    /**
     * Returns true if view has status NONE
     * @returns {boolean}
     */
    ns.View.prototype.isNone = function() {
        return (this.status === this.STATUS.NONE);
    };

    /**
     * Возвращает true, если блок валиден.
     * @returns {boolean}
     */
    ns.View.prototype.isValid = function() {
        return this.isOk() && this.isModelsValidWithVersions();
    };

    /**
     * Возвращает true, если блок валиден.
     * @ignore
     * @method
     * @returns {boolean}
     */
    ns.View.prototype.isValidSelf = ns.View.prototype.isValid;

    /**
     * Returns true if models are valid and not be updated after last view update.
     * @returns {boolean}
     */
    ns.View.prototype.isModelsValidWithVersions = function() {
        return this.isModelsValid(this._modelsVersions);
    };

    /**
     * Возвращает true, если все модели валидны.
     * @param {object} [modelsVersions] Также проверяем, что кеш модели не свежее переданной версии.
     * @returns {Boolean}
     */
    ns.View.prototype.isModelsValid = function(modelsVersions) {
        var models = this.models;
        for (var id in models) {
            /** @type ns.Model */
            var model = models[id];
            if (
                // модель не валидна
                !model.isValid() ||
                // или у неё уже более новая версия данных
                (modelsVersions && model.getVersion() > modelsVersions[id])
            ) {
                return false;
            }
        }

        return true;
    };

    /**
     * Вызываем callback для всех подблоков.
     * Это плоский метод. Он работает только с подблоками и не уходит рекурсивно вглубь by design.
     * @param {function} callback
     * @private
     */
    ns.View.prototype._apply = function(callback) {
        var views = this.views;
        for (var id in views) {
            callback(views[id], id);
        }
    };

    /**
     * Запоминаем свой кусок раскладки страницы для дальнейших перерисовок (например, async).
     * @param {object} pageLayout
     * @private
     */
    ns.View.prototype._saveLayout = function(pageLayout) {
        // запоминаем свой кусок layout
        this.layout = {};
        this.layout[this.id] = {
            views: pageLayout
        };
    };

    /**
     * Рекурсивно проходимся по дереву блоков (построенному по layout) и выбираем новые блоки или
     * требующие перерисовки. Раскладываем их в две "кучки": sync и async.
     * @param {object} updated Hash for sync and async views.
     * @param {ns.View[]} updated.sync Sync views.
     * @param {ns.View[]} updated.async Sync views.
     * @param {object} pageLayout Currently processing layout.
     * @param {object} params Params.
     * @returns {object}
     * @private
     */
    ns.View.prototype._getRequestViews = function(updated, pageLayout, params) {
        // При необходимости добавим текущий вид в список "запрашиваемых"
        this._tryPushToRequest(updated);

        this._saveLayout(pageLayout);

        // Создаем подблоки
        for (var view_id in pageLayout) {
            this._addView(view_id, params, pageLayout[view_id].type);
        }

        this._apply(function(view, id) {
            view._getRequestViews(updated, pageLayout[id].views, params);
        });

        return updated;
    };

    /**
     * Добавляет вид в соответствующий список "запрашиваемых" видов в случае,
     * если запрос необходим
     * @private
     */
    ns.View.prototype._tryPushToRequest = function(updated) {
        /**
         * Флаг, означающий, что view грузится асинхронно.
         * @type {Boolean}
         */
        this.asyncState = false;

        if (this.async) {
            var hasValidModels = this.isModelsValid();
            var hasValidStatus = this.isOk();

            // shouldBeSync - специальный флаг, чтобы вид отрисовался
            // раньше это работало так,
            // update параллельно запрашивал модели для синхронных видов и асинхронных
            // поэтому когда запускался update для асинхронных модели уже были готовы и hasValidModels === true
            if (this.shouldBeSync || (hasValidModels && !hasValidStatus)) {
                // если асинхронный блок имеет валидные модели, но невалидный статус - рисуем его синхронно
                updated.sync.push(this);

            } else if (!hasValidModels) {
                this.asyncState = true;
                // если асинхронный блок имеет невалидные модели, то его не надо рисовать сразу
                updated.async.push(this);
                // прекращаем обработку
                return updated;
            }
        } else if (!this.isValidSelf()) {
            // если обычный блок не валиден
            updated.sync.push(this);
        }

        return updated;
    };

    /**
     *  Строим дерево для шаблонизатора.
     *  @description
     *  В tree.views будет дерево блоков, которые нужно сгенерить,
     *  причем на верхнем уровне будут т.н. toplevel-блоки --
     *  это невалидные блоки и выше их все блоки валидны.
     *  В частности, это значит, что если блок невалидный, то он будет перерисован
     *  со всеми своими подблоками.
     *
     *  В tree.models будут все модели, требуемые для этих блоков.
     *  @private
     */
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
     * Возвращает общее дерево видов.
     * Этот метод используют ns.View, ns.ViewCollection и ns.Box
     * @returns {ns.View~UpdateTree}
     */
    ns.View.prototype._getCommonTree = function() {
        var tree = {
            collection: false,
            box: false,
            key: this.key,
            models: {},
            params: this.params,

            // состояние вида, по сути выбираем моду для отрисовку
            // ok - ns-view-content
            // loading - ns-view-async-content
            // error - ns-view-error-content
            // placeholder - специальная отрисовка
            state: this.asyncState ? 'loading': 'ok',

            // фейковое дерево, чтобы удобно матчится в yate
            tree: {},
            views: {}
        };

        // добавляем название view, чтобы можно было писать
        // match .view-name ns-view-content
        tree.tree[this.id] = true;

        return tree;
    };

    /**
     * Возвращает общее дерево для ns.View и ns.ViewCollection.
     * @returns {ns.View~UpdateTree}
     * @private
     */
    ns.View.prototype._getTree = function() {
        var tree = this._getCommonTree();

        // даем возможность приложению или плагинам изменить дерево
        var treeToAppend = this.patchTree(tree);

        // если вернули правда объект, то расширяем его
        if (treeToAppend && typeof treeToAppend === 'object' && !Array.isArray(treeToAppend)) {
            // расширяем переданный объект, чтобы он не перетер внутренние свойства
            tree = no.extend(treeToAppend, tree);
        }

        return tree;
    };

    /**
     * Строим дерево блоков.
     * @param {object} layout Currently processing layout.
     * @param {object} params Params.
     * @returns {ns.View~UpdateTree}
     * @private
     */
    ns.View.prototype._getViewTree = function(layout, params) {
        var tree = this._getTree();

        // всегда собираем данные, в том числе закешированные модели для async-view
        tree.models = this._getModelsForTree();

        // для асинхронного вида не идем вниз по дереву
        if (tree.state === 'loading') {
            return tree;
        }

        // если у вида невалидные модели, то ставим статус 'error'
        if (!this.isModelsValid()) {
            tree.state = 'error';
        }

        //  Сюда попадают только синхронные блоки.

        //  Это блок без подблоков.
        if (typeof layout !== 'object') {
            return true;
        }

        tree.views = this._getDescViewTree(layout, params);

        return tree;
    };

    /**
     * Дополняет дерево видов.
     * @description
     * Этот метод является точкой расширения для приложений или плагинов.
     * Метод должен вернуть объект, который будет добавлен к дереву.
     * Все свойства, конфликтующие с внутренними, будут перетерты.
     * @example
     * ```js
     * ns.View.prototype.patchTree = function(tree) {
     *     // добавляем в дерево ссылки на экземпляры вида и моделей
     *     return {
     *         instance: {
     *             view: this,
     *             models: this.models
     *         }
     *     };
     * }
     * ```
     * @param {object} tree Дерево наложения.
     * @returns {object}
     * @method
     */
    ns.View.prototype.patchTree = no.nop;

    /**
     * Возвращает деревья для дочерних видов
     * @param {object} layout
     * @param {object} params
     * @returns {object.<string, ns.View~UpdateTree>}
     * @private
     */
    ns.View.prototype._getDescViewTree = function(layout, params) {
        var views = {};
        //  Собираем дерево рекурсивно из подблоков.
        this._apply(function(view, id) {
            views[id] = view._getViewTree(layout[id].views, params);
        });

        return views;
    };

    /**
     * Возвращает декларацию вида для вставки плейсхолдера
     * @param {object} layout Currently processing layout.
     * @param {object} params Params.
     * @returns {ns.View~UpdateTree}
     * @private
     */
    ns.View.prototype._getPlaceholderTree = function(layout, params) {
        var tree = this._getTree();
        tree.collection = true;
        tree.state = 'placeholder';
        tree.views = this._getDescViewTree(layout, params);

        return tree;
    };

    /**
     *
     * @returns {*}
     * @private
     */
    ns.View.prototype._getModelsForTree = function() {
        var modelsData = {};

        var models = this.models;
        for (var id in models) {
            /** @type ns.Model */
            var model = models[id];
            modelsData[id] = {};
            if (model.isValid()) {
                // successful model status
                modelsData[id].status = 'ok';
                // structure for convenient matching
                modelsData[id][id] = model.getData();
            } else {
                // insuccessful model status
                modelsData[id].status = 'error';
                // structure for convenient matching
                modelsData[id][id] = model.getError();
            }
        }

        return modelsData;
    };

    /**
     * Returns model.
     * @param {string} id Model ID
     * @returns {ns.Model}
     */
    ns.View.prototype.getModel = function(id) {
        return this.models[id];
    };

    /**
     * Returns data of model.
     * @param {string} id Model ID
     * @returns {*}
     */
    ns.View.prototype.getModelData = function(id) {
        return this.getModel(id).getData();
    };

    /**
     * Быстро что-нибудь сгенерить из данных блока.
     * Можно передать моду и дополнительный объект, который попадет в /.extra:
     * @param {string} mode
     * @param {object} extra
     * @returns {HTMLElement}
     * @example
     * ```js
     * block.tmpl()
     * block.tmpl('mode')
     * block.tmpl({ ... })
     * block.tmpl('mode', { ... })
     * ```
     */
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

        var renderTree = this._getTree();
        renderTree.models = this._getModelsForTree();

        if (extra) {
            renderTree.extra = extra;
        }

        var mainTree = {
            views: {}
        };
        mainTree.views[this.id] = renderTree;

        return ns.renderNode(mainTree, mode);
    };

    /**
     * Возвращает массив всех вложенных view, включая себя
     * FIXME: это же _getDescendantsOrSelf
     * @param {Array} [views=[]] Начальный массив.
     * @returns {Array}
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

    /**
     * Set view node
     * @param {HTMLElement} node
     * @protected
     */
    ns.View.prototype._setNode = function(node) {
        var STATUS = this.STATUS;
        if (node) {
            this.node = node;
            this.$node = $(node);

            this.status = this.asyncState ? STATUS.LOADING : STATUS.OK;

        } else {
            this.status = STATUS.NONE;
        }
    };

    /**
     *
     * @param {HTMLElement} node
     * @returns {HTMLElement}
     * @private
     */
    ns.View.prototype._extractNode = function(node) {
        var viewNode;
        // Найдём ноду по классу
        var viewNodes = ns.byClass('ns-view-' + this.id, node);

        // Если такая одна, то это то, что нам нужно
        if (1 === viewNodes.length) {
            viewNode = viewNodes[0];
        } else {
            // Если этих нод много, придётся заjQuerить
            for (var i = 0; i < viewNodes.length; i++) {
                if (viewNodes[i].getAttribute('data-key') === this.key) {
                    viewNode = viewNodes[i];
                }
            }
        }

        return viewNode;
    };

    /**
     * Обновляем (если нужно) ноду блока.
     * @param {HTMLElement} node
     * @param {object} layout
     * @param {object} params
     * @param {object} updateOptions
     * @param {object} events
     * @private
     */
    ns.View.prototype._updateHTML = function(node, layout, params, updateOptions, events) {

        //  FIXME nop@: Велик могучим русский языка!
        //  Падежи не сходятся вообще :(
        //
        // при обработке toplevel-view надо скопировать первоначальные updateOptions
        // инчае, при обновлении параллельных веток дерева, toplevel оказажется только первая
        // и, соответственно, DOM-надо обновиться только у нее
        // {
        //   "my-root-view1": {/* tree 1 */},
        //   "my-root-view2": {/* tree 2 */}
        // }
        var options_next;
        if (updateOptions.toplevel) {
            options_next = no.extend({}, updateOptions);

        } else {
            options_next = updateOptions;
        }

        var syncUpdate = !updateOptions.async;
        var viewWasInvalid = !this.isValid();

        var viewNode;
        //  Если блок уже валидный, ничего не делаем, идем ниже по дереву.
        if ( viewWasInvalid ) {
            //  Ищем новую ноду блока.
            viewNode = this._extractNode(node);
            ns.assert(viewNode, 'ns.View', "Can't find node for '%s'", this.id);

            //  Обновляем весь блок.
            //  toplevel-блок -- это невалидный блок, выше которого все блоки валидны.
            //  Для таких блоков нужно вставить их ноду в DOM, а все его подблоки
            //  автоматически попадут на нужное место.

            if (updateOptions.toplevel) {
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
                this._hide(events['ns-view-hide']);
                this._htmldestroy(events['ns-view-htmldestroy']);
            }

            //  новая нода должна в любом случае попасть в DOM
            if (this.node && !updateOptions.parent_added && !options_next.parent_added) {
                ns.replaceNode(this.node, viewNode);
            }

            //  Запоминаем новую ноду.
            this._setNode(viewNode);

            if ( this.isOk() ) {
                this._htmlinit(events['ns-view-htmlinit']);

            } else if (this.isLoading()) {
                // В асинхронном запросе вызываем async для view, которые являются заглушкой.
                events['ns-view-async'].push(this);
            }

            this._saveModelsVersions();
        }

        // Если view валидный и не в async-режиме, то вызывается show и touch
        // Для валидных view при втором проходе (когда отрисовываются asynс-view) не надо второй раз кидать touch

        // Условие звучит так "(Если мы в синхнронном ns.Update и view стал валиден) или (view был не валиден и стал валиден)"
        // Второе условие относится как к перерисованным view, так и к async-view, которые полностью отрисовались
        if ( (syncUpdate || viewWasInvalid) && this.isOk() ) {
            // событие show будет вызвано, если у view поменяется this._visible
            this._show(events['ns-view-show']);
            events['ns-view-touch'].push(this);
        }

        //  Т.к. мы, возможно, сделали replaceNode, то внутри node уже может не быть
        //  никаких подблоков. В этом случае, нужно брать viewNode.
        viewNode = viewNode || node;

        //  Рекурсивно идем вниз по дереву, если не находимся в async-режиме
        if (!this.asyncState) {
            this._apply(function(view, id) {
                view._updateHTML(viewNode, layout[id].views, params, options_next, events);
            });
        }
    };

    /**
     * Safe models versions to track changes.
     * @protected
     */
    ns.View.prototype._saveModelsVersions = function() {
        for (var modelId in this.models) {
            this._modelsVersions[modelId] = this.models[modelId].getVersion();
        }
    };

    /**
     * Оставляет вид валидным после изменения моделей
     * @method
     */
    ns.View.prototype.keepValid = ns.View.prototype._saveModelsVersions;

    /**
     * Запускает собственный ns.Update после завершения promise.
     * @param {Vow.Promise} promise Промис, после которого запустить ns.Update
     * @returns {Vow.Promise}
     */
    ns.View.prototype.updateAfter = function(promise) {
        this._asyncPromise = new Vow.Promise();

        var that = this;
        promise.then(function() {
            that.update();
        });

        return this._asyncPromise;
    };

    /**
     * Запускает на себе ns.Update
     * @param {object} [params={}] Дополнительные параметры. Могут использоваться при ручном запуске.
     * @returns {Vow.Promise}
     */
    ns.View.prototype.update = function(params) {
        this.shouldBeSync = true;

        if (!this.layout) {
            /*
            FIXME: надо тут делать настоящий layout.define, потом undefine, а не подделывать структуру
            // создаем фейковый временный layout, чтобы отправить его в update
            var fakeLayoutName = 'ns-temp-layout-for-' + this.id;
            var fakeLayout = {};
            fakeLayout[this.id] = {};
            ns.layout.define(fakeLayoutName, fakeLayout);

            this.layout = ns.layout.page(fakeLayoutName, updateParams);

            // удаляем временный layout
            ns.layout.undefine(fakeLayoutName);

             */

            // если нет layout, то это элемент коллекции и сюда не приходит _applyLayout
            this.layout = {};
            this.layout[this.id] = {
                views: {}
            };
        }

        var updateParams = this.params;
        if (params) {
            // если передали собственные параметры, то надо их скопировать
            // собственные параметры удобны при ручном вызове этого метода,
            // если ниже по дереву есть боксы
            updateParams = no.extend({}, this.params, params);
        }

        var updatePromise = new ns.Update(this, this.layout, updateParams, {
            execFlag: ns.U.EXEC.ASYNC
        }).render();

        // у элемента коллекции его нет
        if (this._asyncPromise) {
            this._asyncPromise.sync(updatePromise);
        }

        return updatePromise;
    };

    var _infos = {};
    var _ctors = {};

    /**
     * Определяет новый View.
     * @description
     * ns.Events представляет из себя объект {"eventDecl1": "handler1", "eventDecl2": "handler2"}.
     * "eventDecl" записывается в виде "eventName [ selector ]".
     * "selector" опционален, если его нет, то события регистрируется на ноду View.
     * "handler" может быть строка (тогда она заменится на метод прототипа) или функция.
     * Все хендлеры биндятся на экземпляр View.
     * Разделение на типы событий происходит автоматически по следующим правилам (в порядке приоритета):
     *   - если selector === "window" || selector == "document", то обработчик регистрируется по событию show
     *   - если eventName === "resize", то обработчик регистрируется по событию show
     *   - если eventName === "scroll", то обработчик регистрируется по событию htmlinit с помощью $viewNode.find(selector).on(eventName, handler)
     *   - иначе обработчик регистрируется по событию htmlinit с помощью $viewNode.on(eventName, selector, handler)
     * @param {string} id Название View.
     * @param {object} [info={}] Декларация View.
     * @param {Function} [info.ctor] Конструтор.
     * @param {object} [info.methods] Методы, переопределяющие стандартные методы View.
     * @param {Object|Array} [info.models] Массив или объект с моделями, от которых зависит View. Для объекта: true означает модель должна быть валидной для отрисовки view.
     * @param {object} [info.events] DOM-события, на которые подписывается View.
     * @param {Function|String} [base=ns.View] Базовый View для наследования
     * @returns {Function} Созданный View.
     */
    ns.View.define = function(id, info, base) {
        ns.assert(!(id in _infos), 'ns.View', "Can't redefine '%s'", id);

        info = info || {};

        var baseClass = this;
        if (typeof base === 'string') {
            // если указана строка, то берем декларацию ns.View
            baseClass = _ctors[base];
            ns.assert(baseClass, 'ns.View', "Can't find '%s' to extend '%s'", base, id);

        } else if (typeof base === 'function') {
            baseClass = base;
        }

        var ctor = info.ctor || function() {};
        // Нужно унаследоваться от ns.View и добавить в прототип info.methods.
        ctor = no.inherit(ctor, baseClass, info.methods);

        info.models = this._formatModelsDecl( info.models || {} );
        info.events = info.events || {};

        // часть дополнительной обработки производится в ns.View.info
        // т.о. получаем lazy-определение

        _infos[id] = info;
        _ctors[id] = ctor;

        return ctor;
    };

    /**
     * Устанавливает виды в начальное состояние
     * @private
     */
    ns.View._reset = function() {
        _ctors = {};
        _infos = {};
    };

    /**
     * Возвращает сохраненную декларацию ns.View без обработки.
     * @param {string} id Название вида.
     * @returns {object}
     * @throws Бросает исключения, если вид не определен
     */
    ns.View.infoLite = function(id) {
        var info = _infos[id];
        ns.assert(info, 'ns.View', "'%s' is not defined", id);
        return info;
    };

    /**
     * Возвращает обработанную информацию о View.
     * @param {string} id Название вида.
     * @returns {object}
     * @throws Бросает исключения, если вид не определен
     */
    ns.View.info = function(id) {
        var info = ns.View.infoLite(id);
        // если есть декларация, но еще нет pGroups, то надо завершить определение View
        if (info && !info.pGroups) {
            ns.View._initInfoParams(info);
            ns.View._initInfoEvents(info);
        }
        return info;
    };

    /**
     *
     * @param {object} info
     * @private
     */
    ns.View._initInfoParams = function(info) {
        if (info.params) {
            ns.assert(!info['params+'], 'ns.View', 'you cannot specify params and params+ at the same time');
            ns.assert(!info['params-'], 'ns.View', 'you cannot specify params and params- at the same time');

            var groups;
            var pGroups = [];
            if ( !Array.isArray(info.params) ) {
                groups = [ info.params ];
            } else {
                groups = info.params;
            }

            for (var i = 0; i < groups.length; i++) {
                var group = groups[i];
                // Если в params задано значение параметра -- это фильтр.
                // Опциональные параметры view это параметры моделей с дефолтным значением.
                // Опциональные параметры есть только когда параметры view формируются из параметров моделей (смотри ниже).
                pGroups.push({
                    pNames: Object.keys(group),
                    pFilters: group,
                    pDefaults: {}
                });
            }

            info.pGroups = pGroups;

        } else {
            var params = {};
            for (var model_id in info.models) {
                var modelInfo = ns.Model.info(model_id);
                ns.assert(modelInfo, ns.View, 'Model %s is not defined!', model_id);

                no.extend( params, modelInfo.params );
            }

            //  Массив с параметрами, которые надо исключить из ключа.
            var exclude = info['params-'];
            if (exclude) {
                for (var i = 0; i < exclude.length; i++) {
                    delete params[ exclude[i] ];
                }

                delete info['params-'];
            }

            //  Дополнительные параметры (расширяют параметры от моделей или перекрывают их).
            if (info['params+']) {
                no.extend( params, info['params+'] );
                delete info['params+'];
            }

            // Когда параметры строятся из параметров моделей нет фильтров параметров.
            // И групп параметров - всего одна.
            var pNames = Object.keys(params);
            if (pNames.length) {
                info.pGroups = [
                    {
                        pNames: pNames,
                        pFilters: {},
                        pDefaults: params
                    }
                ];
            } else {
                info.pGroups = [];
            }
        }
    };

    /**
     *
     * @param {object} info
     * @private
     */
    ns.View._initInfoEvents = function(info) {
        /**
         * События, которые надо повесить сразу при создании view
         * @type {Array}
         */
        info.createEvents = [];

        /**
         * События, которые вешаются на htmlinit, снимаются на htmldestroy
         * @type {object}
         */
        info.initEvents = {
            'bind': [],
            'delegate': []
        };

        /**
         * События, которые вешаются на show, снимаются на hide
         * @type {object}
         */
        info.showEvents = {
            'bind': [],
            'delegate': []
        };

        /**
         * Декларации подписок на кастомные события при создании View.
         * @type {object}
         */
        info.initNoevents = {
            'global': [],
            'local': []
        };

        /**
         * Декларации подписок на кастомные события при показе View.
         * @type {object}
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
                    // событие init тригерится при создании блока, поэтому вешать его надо сразу
                    // событие async тригерится до всего, его тоже надо вешать
                    if (eventName === 'ns-view-init' || eventName === 'ns-view-async') {
                        info.createEvents.push([eventName, handler]);

                    } else {
                        // к View нельзя получить доступ, поэтому локальными могут быть только встроенные ns-* события
                        if (ns.V.NS_EVENTS.indexOf(eventName) > -1) {
                            // все ns-view-* события вешаем на init
                            info['initNoevents'].local.push([eventName, handler]);

                        } else {
                            /*
                            Кастомные ("космические") события через общую шину (ns.events) по умолчанию вешаются на show и снимаются на hide.

                            Логика такая:
                            На странице может быть много экземпляров одного вида и каждый из них отреагирует, если будет init.
                            Но кастомные события создавались для общения вида с внешним миром, и обычно реагировать должны только видимые виды.
                            Опять же инициатором такого события (в большинстве случаев) будет действие пользователя, а обработчики DOM-событий вешаются на show.
                             */

                            when = when || 'show';
                            info[when + 'Noevents'].global.push([eventName, handler]);
                        }
                    }
                }
            }
        }
    };

    /**
     *
     * @param {string} id
     * @param {object} params
     * @param {object} [info]
     * @returns {string}
     */
    ns.View.getKey = function(id, params, info) {
        return this.getKeyAndParams(id, params, info).key;
    };

    /**
     * Возвращает ключ объекта и параметры с учётом rewriteParamsOnInit
     * В этом методе собрана вся логика рерайтов параметров при создании view
     * @returns {object}
     */
    ns.View.getKeyAndParams = function(id, params, info) {
        //  Ключ можно вычислить даже для неопределенных view,
        //  в частности, для боксов.
        info = info || ns.View.info(id) || {};

        if ('function' === typeof info.rewriteParamsOnInit) {
            //  если для view определен метод rewriteParamsOnInit и он вернул объект,
            //  то перепишем параметры
            params = info.rewriteParamsOnInit(no.extend({}, params)) || params;
        }

        var keyParams;
        if ('function' === typeof info.params) {
            keyParams = info.params(params);
        } else {
            keyParams = ns.View._getKeyParams(id, params, info);
        }

        ns.assert(keyParams, 'ns.View', 'Could not generate key for view %s', id);

        return {
            params: params,                      // параметры с учётом rewrite (полный набор параметров, а не только то, что нужно в ключе)
            key: ns.key('view=' + id, keyParams) // ключ с учётом правильных параметров для ключа
        };
    };

    /**
     *
     * @param {string} id
     * @param {object} params
     * @param {object} info
     * @returns {*}
     * @private
     */
    ns.View._getKeyParams = function(id, params, info) {
        var pGroups = info.pGroups || [];

        // Группы параметров могут быть не заданы (это ок).
        if (!pGroups.length) {
            return {};
        }

        for (var g = 0; g < pGroups.length; g++) {
            var group = pGroups[g];
            var pNames = group.pNames || [];
            var pFilters = group.pFilters || {};
            var pDefaults = group.pDefaults || {};
            var result = {};

            for (var i = 0, l = pNames.length; i < l; i++) {
                var pName = pNames[i];
                var pValue = params[pName];
                var pFilter = pFilters[pName];
                var isOptional = pName in pDefaults;

                pValue = (pValue === undefined) ? pDefaults[pName] : pValue;

                if (pValue == null && isOptional) {
                    continue;
                }

                if (pValue == null || (pFilter && pValue !== pFilter)) {
                    result = null;
                    break;
                }

                result[pName] = pValue;
            }

            if (result) {
                return result;
            }
        }

        return null;
    };

    /**
     * Фабрика ns.View
     * @param {string} id ID view.
     * @param {object} [params] Параметры view.
     * @param {Boolean} [async=false] Может ли view бы асинхронным.
     * @returns {ns.View}
     */
    ns.View.create = function(id, params, async) {
        var Ctor = _ctors[id];
        ns.assert(Ctor, 'ns.View', "'%s' is not defined", id);

        /**
         * @type {ns.View}
         */
        var view = new Ctor();
        view._init(id, params, async);

        return view;
    };

    /**
     * События моделей, обрабатываемые видом по умолчанию
     */
    ns.View.defaultModelEvents = {
        'ns-model-insert': 'invalidate',
        'ns-model-remove': 'invalidate',
        'ns-model-changed': 'invalidate',
        'ns-model-destroyed': 'invalidate'
    };

    /**
     * Преобразует декларацию в виде массива ['model1', 'model2', ...]
     * в объект {model1: 'handlerDefault1', model2: 'handlerDefault2', ...}
     * @param {array} decl
     * @return {object}
     * @private
     */
    ns.View._expandModelsDecl = function(decl) {
        if (!Array.isArray(decl)) {
            return decl;
        }

        var declExpanded = {};

        for (var i = 0, l = decl.length; i < l; i++) {
            declExpanded[decl[i]] = no.extend({}, this.defaultModelEvents);
        }

        return declExpanded;
    };

    /**
     * Преобразует разные варианты деклараций подписки на события модели
     * в единый расширенный формат
     *
     * @param {object[]} decls
     * @returns {{}}
     * @private
     */
    ns.View._formatModelsDecl = function(decls) {
        var declsFormated = this._expandModelsDecl(decls);

        // Разрвернём краткий вариант декларации в полный
        for (var idModel in declsFormated) {
            var declFull = getFullMethodDecl(declsFormated[idModel]);

            // общий обработчик для всех событий
            var methodCommon = null;
            if ('string' === typeof declFull) {
                methodCommon = declFull;
                declFull = {};
            }

            // нужно гарантировать подписку на все стандартные события
            for (var eventName in this.defaultModelEvents) {

                // обработчик события по умолчанию
                var methodDefault = this.defaultModelEvents[eventName];

                if (undefined === declFull[eventName]) {
                    // если обработчик события явно не задан,
                    // используем общий обработчик или, если такого нет, обработчик по умолчанию
                    declFull[eventName] = methodCommon || methodDefault;
                } else {
                    // если обработчик явно задан, используем его,
                    // приведя к полному виду
                    declFull[eventName] = getFullMethodDecl(declFull[eventName]);
                }
            }

            declsFormated[idModel] = declFull;
        }

        return declsFormated;
    };

    /**
     * Преобразует краткую декларацию (true|false) обработчика события в полную
     * или возвращает исходную.
     *  - true  -> invalidate
     *  - false -> keepValid
     */
    var getFullMethodDecl = function(decl) {
        if (true === decl) {
            return 'invalidate';
        } else if (false === decl) {
            return 'keepValid';
        }
        return decl;
    };

    /**
     * Дерево для шаблонизации вида.
     * @typedef ns.View~UpdateTree
     * @type {object}
     * @property {boolean} box - Флаг указывающий, что это бокс.
     * @property {boolean} collection - Флаг указывающий, что это вид-коллекция.
     * @property {string} key - Ключ вида.
     * @property {object.<string, *>} models - Объект с данными моделей. Не стоит использовать его напрямую. Лучше вызывать yate-функции `model('modelName')` и `modelError('modelName')`.
     * @property {object.<string, *>} params - Собственные параметры вида.
     * @property {string} state - Текущее состояние вида. ok/error/loading/placeholder
     * @property {object.<string, ns.View~UpdateTree>} views - Объект с дочерними видами, используется для дальнейшего наложения шаблонов через `ns-view-content`.
     */

})();
