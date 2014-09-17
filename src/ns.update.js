(function() {

    /**
     * Создает ns.Update
     * @classdesc ns.Update
     * @param {ns.View} view Корневой view.
     * @param {object} layout Layout для этого view, результат от ns.layout.page()
     * @param {object} params Параметры, результат от ns.router()
     * @param {ns.Update~options} [options] Опции исполнения.
     * @constructor
     * @example
     * ```js
     * var route = ns.router('/folder/123/message/456');
     * var layout = ns.layout.page(route.page, route.params);
     * var update = new ns.Update(AppBlock, layout, route.params);
     * update.start();
     * ```
     * @tutorial ns.update
     * @tutorial ns.update.logic
     * @mixes ns.profile
     */
    ns.Update = function(view, layout, params, options) {
        /**
         * Корневой view.
         * @private
         * @type {ns.View}
         */
        this.view = view;

        // ищем layout от view
        if (this.view.id in layout) {
            this.layout = layout[this.view.id];

        } else {
            // если его нет - ругаемся
            throw new Error("[ns.Update] Can't find view layout");
        }

        this.params = params;

        this.id = ++update_id;

        this.promise = new Vow.Promise();

        options = options || {};

        /**
         * Execution flag
         * @type {ns.U.EXEC}
         */
        this.EXEC_FLAG = options.execFlag || ns.U.EXEC.GLOBAL;

        this.log('created instance', this, 'with layout', this.layout, 'and params', this.params);

        if (!ns.Update._addToQueue(this)) {
            this.abort();
        }
    };

    no.extend(ns.Update.prototype, ns.profile);

    /**
     * Current ns.Updates.
     * @type ns.Update[]
     * @private
     */
    var currentUpdates = [];

    /**
     * Id последнего созданного update-а.
     * @type {number}
     */
    var update_id = -1;

    /**
     * @see ns.U.STATUS
     * @type {ns.U.STATUS}
     */
    ns.Update.prototype.STATUS = ns.U.STATUS;

    /**
     * Порядок событий для View.
     * @type {Array}
     * @private
     */
    ns.Update.prototype._EVENTS_ORDER = ['ns-view-hide', 'ns-view-htmldestroy', 'ns-view-htmlinit', 'ns-view-async', 'ns-view-show', 'ns-view-touch'];

    /**
     * Регистрирует указанное событие, добавляя к нему признаки ns.update
     * @private
     */
    ns.Update.prototype.log = function() {
        if (!ns.DEBUG) {
            return;
        }

        var args = Array.prototype.slice.apply(arguments);
        // Тут приходит оочень большая портянка html-кода, читать ее неудобно и она засоряет консоль.
        // Поэтому оборачиваем в ноду.
        if (args[0] === 'generated html') {
            args[1] = ns.html2node(args[1]);
        }

        ns.log.debug.apply(ns.log,
            ['[ns.Update]', this.id].concat(args)
        );
    };

    /**
     * Запрашивает модели
     * @private
     * @param {array} models
     * @returns {Vow.promise}
     */
    ns.Update.prototype._requestModels = function(models) {
        this.startTimer('requestModels');
        this.log('started models request', models);

        var allModelsValid = true;
        for (var i = 0, j = models.length; i < j; i++) {
            if (!models[i].isValid()) {
                allModelsValid = false;
                break;
            }
        }

        if (allModelsValid) {
            this.log('received models', models);
            return Vow.fulfill(models);
        }

        var promise = ns.request.models(models);
        promise.always(function() {
            this.stopTimer('requestModels');
        }, this);

        return promise
            .then(this._onRequestModelsOK, this._onRequestModelsError, this);
    };

    ns.Update.prototype._onRequestModelsOK = function(models) {
        this.log('received models', models);
        return models;
    };

    ns.Update.prototype._onRequestModelsError = function(err) {
        this.log('failed to receive models', err);

        var error = {
            error: this.STATUS.MODELS,
            invalidModels: err.invalid,
            validModels: err.valid
        };

        if (ns.Update.handleError(error, this)) {
            return [].concat(err.invalid, err.valid);

        } else {
            return Vow.reject(error);
        }

    };

    /**
     * Запрашивает модели синхронных видов
     * @private
     * @returns {Vow.promise}
     */
    ns.Update.prototype._requestSyncModels = function() {
        this.startTimer('collectModels');
        var views = this.view._getRequestViews({
            sync: [],
            async: []
        }, this.layout.views, this.params).sync;
        this.log('collected incomplete views', views);

        var models = views2models(views);
        this.log('collected needed models', models);
        this.stopTimer('collectModels');

        return this._requestModels(models);
    };

    /**
     * Запрашивает модели всех видов
     * @private
     * @returns {Vow.Promise}
     */
    ns.Update.prototype._requestAllModels = function() {
        if (this._expired()) {
            return this._rejectWithStatus(this.STATUS.EXPIRED);
        }

        this.startTimer('collectModels');

        var requestPromise = new Vow.Promise();

        var views = this.view._getRequestViews({
            sync: [],
            async: []
        }, this.layout.views, this.params);
        this.log('collected incomplete views', views);

        var models = views2models(views.sync);
        this.log('collected needed models', models);
        this.stopTimer('collectModels');

        var syncPromise = this._requestModels(models);

        /*
         Каждому async-view передаем главный Promise из Update
         Когда он зарезолвится, вид сам запустит update на себе

         TODO: Возможная оптимизация: в этом месте можно сделать запрос моделей для async-видов без какой-либо реакции на результат.
         Это позволит отрисовать их немного быстрее, потому что в текущем виде они будут ждать полной отрисовки sync-видов.
         Обратная сторона медали - в браузере могут кончиться коннекты :)
         */
        var asyncPromises = views.async.map(function(/** ns.View */view) {
            return view.updateAfter(this.promise);
        }, this);

        syncPromise.then(function() {
            requestPromise.fulfill({
                async: asyncPromises
            });
        }, function(e) {
            requestPromise.reject(e);
        });

        return requestPromise;
    };

    /**
     * Рекурсивно на основе layout
     *  1. создаёт экземпляры видов
     *  2. устанавливает видам asyncState
     */
    ns.Update.prototype._applyLayout = function() {
        // FIXME: методы продублированы специально с заделом на будущий рефакторинг
        this.view._getRequestViews({sync: [], async: []}, this.layout.views, this.params);
    };

    /**
     * Генерирует html недостающих видов
     * @private
     * @returns {Vow.Promise}
     */
    ns.Update.prototype._generateHTML = function() {
        if (this._expired()) {
            return this._rejectWithStatus(this.STATUS.EXPIRED);
        }

        //  TODO: Проверить, что не начался уже более новый апдейт.
        return Vow.fulfill(this._renderUpdateTree());
    };

    ns.Update.prototype._renderUpdateTree = function() {
        this.startTimer('collectViews');

        var tree = {
            'views': {}
        };
        this.view._getUpdateTree(tree, this.layout.views, this.params);
        this.log('created render tree', tree);
        this.stopTimer('collectViews');

        var html;
        if (!ns.object.isEmpty(tree.views)) {
            this.startTimer('generateHTML');
            html = this.applyTemplate(tree, this.params, this.layout);
            this.log('generated html', html);
            this.stopTimer('generateHTML');
        }

        return html;
    };

    /**
     * Раскладывает html-узлы по видам и триггерит события
     * @private
     * @param {HTMLElement} node
     * @param {boolean} async
     * @returns {Vow.Promise}
     */
    ns.Update.prototype._insertNodes = function(node, async) {
        if (this._expired()) {
            return this._rejectWithStatus(this.STATUS.EXPIRED);
        }

        this.startTimer('insertNodes');

        var hideViewEvents = {
            'ns-view-hide': [],
            'ns-view-htmldestroy': []
        };
        this.view.beforeUpdateHTML(this.layout.views, this.params, hideViewEvents);
        this._triggerViewEvents(hideViewEvents);

        var viewEvents = {
            'ns-view-async': [],
            'ns-view-hide': [],
            'ns-view-htmldestroy': [],
            'ns-view-htmlinit': [],
            'ns-view-show': [],
            'ns-view-touch': []
        };

        this.view._updateHTML(node, this.layout.views, this.params, {
            toplevel: true,
            //TODO: надо понять по истории зачем этот флаг
            async: async
        }, viewEvents);
        this.switchTimer('insertNodes', 'triggerEvents');

        // убираем события hide/htmldestroy, потому что мы их уже кинули в первом проходе
        viewEvents['ns-view-hide'] = [];
        viewEvents['ns-view-htmldestroy'] = [];
        this._triggerViewEvents(viewEvents);
        this.stopTimer('triggerEvents');

        return Vow.fulfill();
    };

    ns.Update.prototype._triggerViewEvents = function(viewEvents) {
        for (var i = 0, j = this._EVENTS_ORDER.length; i < j; i++) {
            var event = this._EVENTS_ORDER[i];
            var views = viewEvents[event] || [];
            for (var k = views.length - 1; k >= 0; k--) {
                views[k].trigger(event, this.params);
            }
        }
    };

    /**
     * Обновляет DOM-представление вида.
     * @description Этот метод - комбинация из generateHTML и insertNodes,
     * которые должны отработать синхронно, чтобы избежать различных спецэффектов.
     *
     * Без этого, например, отрендерить можно одно состояние, но обновить DOM не получится,
     * потому что у видов будет уже другое состояние, если что-то поменяется между generateHTML и insertNodes
     * @private
     */
    ns.Update.prototype._updateDOM = function() {
        if (this._expired()) {
            return this._rejectWithStatus(this.STATUS.EXPIRED);
        }

        var html = this._renderUpdateTree();
        var node = ns.html2node(html || '');
        return this._insertNodes(node);
    };

    /**
     * Сценарий предзапроса моделей.
     * Запрашивает модели всех невалидных и вновь созданных синхронных видов в layout.
     * По завершению запроса разрешает promise
     * @returns {Vow.promise}
     */
    ns.Update.prototype.prefetch = function() {
        this.log('started `prefetch` scenario');
        this.promise = this._requestSyncModels();
        this.promise.then(this._fulfill, this._reject, this);
        return this.promise;
    };

    /**
     * Сценарий генерации html
     * Запрашивает модели всех невалидных и вновь созданных синхронных видов в layout
     * Геренирует html указанных видов
     * Результат генерации передаётся строкой при разрешении promise
     * @returns {Vow.promise}
     */
    ns.Update.prototype.generateHTML = function() {
        this.log('started `generateHTML` scenario');

        Vow.invoke(this._requestSyncModels.bind(this))
            .then(this._generateHTML, null, this)
            .then(this._fulfill, this._reject, this);

        return this.promise;
    };

    /**
     * Сценарий предварительного рендеринга страницы
     * Итогом его работы являются срендеренные и проинициализированные, но скрытые виды.
     * Используется для ускорения перехода на целевую страницу
     * @returns {Vow.promise}
     */
    ns.Update.prototype.prerender = function() {
        this.log('started `prerender` scenario');
        // TODO: здесь концептуально нужно придумать, как разделить стадию insertNodes
        // на непосредственную вставку узлов и их показ
        ns.todo();
        return this.promise;
    };

    /**
     * Сценарий полного рендеринга страницы
     * @returns {Vow.promise}
     */
    ns.Update.prototype.render = function() {
        if (this._expired()) {
            this._reject({
                error: this.STATUS.EXPIRED
            });

            return this.promise;
        }

        this.log('started `render` scenario');

        var asyncViewPromises;
        var saveAsyncPromises = function(result) {
            // сохраняем результат
            asyncViewPromises = result;
        };
        var fulfillWithAsyncPromises = function() {
            this._fulfill(asyncViewPromises);
        };

        // начинаем цепочку с промиса, чтобы ловить ошибки в том числе и из _requestAllModels
        Vow.invoke(this._requestAllModels.bind(this))
            .then(saveAsyncPromises, null, this)
            .then(this._updateDOM, null, this)
            .then(fulfillWithAsyncPromises, this._reject, this);

        return this.promise;
    };

    /**
     * @see #render
     * @deprecated Надо использовать #render
     * @function
     */
    ns.Update.prototype.start = ns.Update.prototype.render;

    /**
     * Сценарий воссоздания приложения из заранее сформированнного dom-дерева страницы
     * @param {HTMLElement} node
     * @returns {Vow.promise}
     */
    ns.Update.prototype.reconstruct = function(node) {
        this.log('started `reconstruct` scenario');
        this._applyLayout();

        Vow.invoke(this._insertNodes.bind(this), node)
            .then(function() {
                this._fulfill({async: []});
            }, this._reject, this);

        return this.promise;
    };

    /**
     * Рендерит дерево видов.
     * @description
     * Этот метод является точкой расширения в приложении.
     * Если приложение использует yate-модули или другой шаблонизатор,
     * то ему надо переопределить этот метод.
     * @param {object} tree Дерево видов.
     * @param {object} params Параметры страницы.
     * @param {object} layout Раскладка страницы.
     * @returns {HTMLElement}
     */
    ns.Update.prototype.applyTemplate = function(tree, params, layout) {
        /* jshint unused: false */
        return ns.renderString(tree, null, '');
    };

    /**
     * @returns {Boolean} true in case another update was created after current update.
     * @private
     */
    ns.Update.prototype._expired = function() {
        // update считается просроченным, если
        // его промис уже зарезолвили (fulfill или reject)
        // его нет в списке активных update (т.е. его кто-то оттуда убрал)
        return this.promise.isResolved() || currentUpdates.indexOf(this) === -1;
    };

    /**
     * Останавливает процесс обновления
     * @private
     */
    ns.Update.prototype.abort = function() {
        //TODO: Should we abort ns.request?

        // reject promise
        this._reject({
            error: ns.U.STATUS.EXPIRED
        });
    };

    /**
     * @private
     * @param {*} result Result data.
     */
    ns.Update.prototype._fulfill = function(result) {
        ns.Update._removeFromQueue(this);
        this.promise.fulfill(result);
        this.perf(this.getTimers());
        this.log('successfully finished scenario');
    };

    /**
     * @private
     * @param {*} reason Error data.
     */
    ns.Update.prototype._reject = function(reason) {
        ns.Update._removeFromQueue(this);
        this.promise.reject(reason);
        this.log('scenario was rejected with reason', reason);
    };

    /**
     * Возвращает reject-промис с статусом
     * @param {ns.U.STATUS} status
     * @returns {Vow.Promise}
     * @private
     */
    ns.Update.prototype._rejectWithStatus = function(status) {
        return Vow.reject({
            error: status
        });
    };

    /**
     * Whether this update is a global update (main update) or not.
     * @returns Boolean.
     */
    ns.Update.prototype.isGlobal = function() {
        return this.EXEC_FLAG === ns.U.EXEC.GLOBAL;
    };

    /**
     * В метод приходят данные профилировщика.
     * @description
     * Этот метод является точкой расширения в приложении.
     * Например, можно логировать долгую работу ns.Update, когда общее время превыщает предел.
     * @param {ns.Update~PerformanceTimings} perf
     */
    ns.Update.prototype.perf = function(perf) {
        /* jshint unused: false */
    };

    /**
     * @typedef ns.Update~PerformanceTimings
     * @type {object}
     * @property {number} prepare Время подготовки запроса.
     * @property {number} request Время запроса данных.
     * @property {number} tree Время подготовки дерева шаблонизации.
     * @property {number} template Время шаблонизации.
     * @property {number} dom Время обновления DOM.
     * @property {number} events Время выполнения событий в видах.
     */

    /**
     * Global error handler.
     * @param {object} error Error summary object `{ error: string, models: Array.<ns.Model> }`.
     * @param {ns.Update} update Update instance so that we can abort it if we want to.
     * @returns Boolean If `true` - update can continue, otherwise update cannot continue.
     */
    ns.Update.handleError = function(error, update) {
        /* jshint unused: false */
        return false;
    };

    function views2models(views) {
        var added = {};
        var models = [];

        for (var i = 0, l = views.length; i < l; i++) {
            var viewModels = views[i].models;
            for (var model_id in viewModels) {
                var model = viewModels[model_id];
                var key = model.key;
                if ( !added[key] ) {
                    models.push(model);
                    added[key] = true;
                }
            }
        }

        return models;
    }

    /**
     * Removes ns.Update instance from queue
     */
    ns.Update._removeFromQueue = function(updateInstance) {
        var index = currentUpdates.indexOf(updateInstance);
        if (index > -1) {
            currentUpdates.splice(index, 1);
        }
    };

    /**
     * Check whether it is possible to execute given ns.Update
     * @description
     * ns.Update can be global, async or parallel.
     * Cases:
     *   - Global update can be terminated by another global Update only.
     *   - Global Update terminated all Updates except parallel.
     *   - Async updates execute simultaneously.
     *   - Parallel update can't be terminated.
     * @static
     *
     * @param {ns.Update} newUpdate New instance of ns.Update.
     * @returns Boolean
     */
    ns.Update._addToQueue = function(newUpdate) {
        var currentRuns = currentUpdates;
        var FLAGS = ns.U.EXEC;
        var FLAG_GLOBAL = FLAGS.GLOBAL;
        var FLAG_PARALLEL = FLAGS.PARALLEL;
        var FLAG_ASYNC = FLAGS.ASYNC;

        var newRunExecutionFlag = newUpdate.EXEC_FLAG;
        var i;
        var j;

        // if newUpdate is global we should terminate all non-parallel updates
        if (newRunExecutionFlag === FLAG_GLOBAL) {
            var survivedRuns = [];

            // прекращаем текущие runs
            // ищем с конца, потому что раны могут удаляться
            for (i = currentRuns.length - 1; i >= 0; i--) {
                /**
                 * @type {ns.Update}
                 */
                var run = currentRuns[i];

                // don't terminated paraller updates
                if (run.EXEC_FLAG === FLAG_PARALLEL) {
                    survivedRuns.push(run);

                } else {
                    run.abort();
                }
            }
            // save survived updates
            currentUpdates = survivedRuns;

        } else if (newRunExecutionFlag === FLAG_ASYNC) { // async update

            // check whether we have one global update
            for (i = 0, j = currentRuns.length; i < j; i++) {
                if (currentRuns[i].EXEC_FLAG === FLAG_GLOBAL) {
                    return false;
                }
            }

        }

        currentUpdates.push(newUpdate);

        return true;
    };

    /**
     * Опции исполнения.
     * @typedef ns.Update~options
     * @type {object}
     * @property {ns.U.EXEC} [execFlag=ns.U.EXEC.GLOBAL] Флаг выполнения.
     */

})();
