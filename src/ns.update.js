(function() {

    /**
     * Создает ns.Update
     * @classdesc ns.Update
     * @param {ns.View} view Корневой view.
     * @param {object} layout Layout для этого view, результат от ns.layout.page()
     * @param {object} params Параметры, результат от ns.router()
     * @param {object} [options] Options for ns.Update
     * @param {ns.U.EXEC} [options.execFlag=ns.U.EXEC.GLOBAL] Options for ns.Update
     * @constructor
     * @example
     * ```js
     * var route = ns.router('/folder/123/message/456');
     * var layout = ns.layout.page(route.page, route.params);
     * var update = new ns.Update(AppBlock, layout, route.params);
     * update.start();
     * ```
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
    ns.Update.prototype.log = no.nop;

    if (ns.DEBUG) {
        // Уберём потенциально тяжёлую функцию за флаг DEBUG
        ns.Update.prototype.log = function() {
            ns.log.debug.apply(ns.log,
                ['[ns.Update]', this.id].concat(Array.prototype.slice.apply(arguments))
            );
        };
    }

    /**
     * Запрашивает модели
     * @private
     * @param {array} models
     * @returns {Vow.promise}
     */
    ns.Update.prototype._requestModels = function(models) {
        var promise = new Vow.Promise();

        this.log('started models request', models);

        ns.request.models(models)
            .then(function(models) {
                if (this._expired()) {
                    promise.reject({
                        error: this.STATUS.EXPIRED,
                        models: models
                    });
                    return;
                }

                promise.fulfill(models);

                this.log('received models', models);
            }, function(err) {
                var error = {
                    error: this.STATUS.MODELS,
                    invalidModels: err.invalid,
                    validModels: err.valid
                };
                if (ns.Update.handleError(error, this)) {
                    promise.fulfill([].concat(err.invalid, err.valid));

                } else {
                    promise.reject(error);
                }

                this.log('failed to receive models', models, err);
            }, this);

        return promise;
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
        this.switchTimer('collectModels', 'requestSyncModels');

        var modelsPromise = this._requestModels(models);
        modelsPromise.always(function() {
            this.stopTimer('requestSyncModels');
        }, this);

        return modelsPromise;
    };

    /**
     * Запрашивает модели всех видов
     * @private
     * @returns {Vow.promise}
     */
    ns.Update.prototype._requestAllModels = function() {
        this.startTimer('collectModels');

        var update = this;

        var requestPromise = new Vow.Promise();

        var views = this.view._getRequestViews({
            sync: [],
            async: []
        }, this.layout.views, this.params);
        this.log('collected incomplete views', views);

        var models = views2models(views.sync);
        this.log('collected needed models', models);
        this.switchTimer('collectModels', 'requestSyncModels');

        var syncPromise = this._requestModels(models);
        syncPromise.always(function() {
            this.stopTimer('requestSyncModels');
        }, this);

        var asyncPromises = [];

        // Для каждого async-view запрашиваем его модели.
        // Когда они приходят, запускаем точно такой же update.
        // Причем ждем отрисовку sync-view, чтобы точно запуститься после него.
        views.async.forEach(function(view) {
            var models = views2models([view]);
            var asyncPromise = new Vow.Promise();
            asyncPromises.push(asyncPromise);

            Vow.all([
                update.promise,
                update._requestModels(models)
            ]).then(function() {

                // FIXME: в идеале нужно вынести подготовку и запуск нового update
                // в сценарий render, т.к. этот метод - только про запрос моделей

                var layout;
                var params;
                // start new async update with current page params to prevent problems
                // if other updates had been completed
                if (ns.page.current.layout) {
                    var currentPage = ns.page.current;
                    layout = currentPage.layout;
                    params = currentPage.params;
                } else {
                    layout = {};
                    layout[update.view.id] = update.layout;
                    params = update.params;
                }

                asyncPromise.sync(
                    new ns.Update(update.view, layout, params, {execFlag: ns.U.EXEC.ASYNC}).rerender()
                );

            }, function(error) {
                asyncPromise.reject(error);
            });
        });

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
     * Рекурсивно устанавливает видам asyncState
     */
    ns.Update.prototype._setAsyncState = function() {
        // FIXME: вызов этого метода здесь несколько избыточен.
        // Он нужен сейчас только для рекурсивного прохода по видам с целью
        // выставления правильного asyncState, хотя кроме этого делает много другого.
        // Правильный путь - все рекурсивные обходы видов вынести в ns.Update
        // Сделаем это позже
        this.view._getRequestViews({sync: [], async: []}, this.layout.views, this.params);
    };

    /**
     * Генерирует html недостающих видов
     * @private
     * @returns {string}
     */
    ns.Update.prototype._generateHTML = function() {
        //  TODO: Проверить, что не начался уже более новый апдейт.

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

        return Vow.fulfill(html);
    };

    /**
     * Раскладывает html-узлы по видам и триггерит события
     * @private
     * @param {string} html
     * @param {boolean} async
     * @returns {string}
     */
    ns.Update.prototype._insertNodes = function(html, async) {
        this.startTimer('insertNodes');
        var node = ns.html2node(html);

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
            async: async
        }, viewEvents);
        this.switchTimer('insertNodes', 'triggerEvents');

        for (var i = 0, j = this._EVENTS_ORDER.length; i < j; i++) {
            var event = this._EVENTS_ORDER[i];
            var views = viewEvents[event];
            for (var k = views.length - 1; k >= 0; k--) {
                views[k].trigger(event, this.params);
            }
        }
        this.stopTimer('triggerEvents');

        return Vow.fulfill();
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
        this._requestSyncModels().then(function() {
            this._generateHTML().then(function(html) {
                this._fulfill(html);
            }, this._reject, this);
        }, this._reject, this);

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
    ns.Update.prototype.start = ns.Update.prototype.render = function() {
        this.log('started `render` scenario');
        this._requestAllModels().then(function(asyncResult) {
            this._generateHTML().then(function(html) {
                this._insertNodes(html).then(function() {
                    this._fulfill(asyncResult);
                }, this);
            }, this._reject, this);
        }, this._reject, this);

        return this.promise;
    };

    /**
     * Сценарий перерисовки страницы без запроса моделей
     * @returns {Vow.promise}
     */
    ns.Update.prototype.rerender = function() {
        this.log('started `_re_render` scenario');
        this._setAsyncState();
        this._generateHTML().then(function(html) {
            this._insertNodes(html, true).then(function() {
                this._fulfill({async: []});
            }, this);
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
        return !this.promise.isResolved() && currentUpdates.indexOf(this) === -1;
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
            //прекращаем текущие runs
            for (i = 0, j = currentRuns.length; i < j; i++) {
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

})();
