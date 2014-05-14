var no = no || require('nommon');
var ns = ns || require('./ns.js');

(function() {

    /**
     * Id последнего созданного update-а.
     * @type {number}
     */
    var update_id = -1;

    /**
     * Current ns.Updates.
     * @type ns.Update[]
     * @private
     */
    var currentUpdates = [];

    /**
     * Создает ns.Update.
     *
     * @classdesc ns.Update
     * @param {ns.View} view Корневой view.
     * @param {object} layout Layout для этого view, результат от ns.layout.page().
     * @param {object} params Параметры, результат от ns.router().
     * @param {object} [options] Опции для ns.Update.
     * @param {ns.U.EXEC} [options.execFlag=ns.U.EXEC.GLOBAL] Тип ns.Update (GLOBAL, PARALLEL, ASYNC).
     * @param {boolean} [options.syncOnly=] Флаг "запросить данные только для синхронных видов". Нужен для генерации html на сервере.
     * @param {boolean} [options.renderOnly=] Флаг "нужен только HTML код". Нужен для генерации html на сервере.
     * @constructor
     * @example
     * ```js
     * var route = ns.router('/folder/123/message/456');
     * var layout = ns.layout.page(route.page, route.params);
     * var update = new ns.Update(AppBlock, layout, route.params);
     * update.start();
     * ```
     * @tutorial ns.update.logic
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

        this.options = options = options || {};

        /**
         * Execution flag
         * @type {ns.U.EXEC}
         */
        this.execFlag = options.execFlag || ns.U.EXEC.GLOBAL;
    };

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
     * Начинает работу updater'а.
     * @param {boolean} [async=false] Флаг асинхронного updater'а.
     * @returns {Vow.Promise}
     */
    ns.Update.prototype.start = function(async) {
        var resultPromise = new Vow.Promise();
        this.promise = resultPromise;

        if (!this.addToQueue(this)) {
            this.abort();
            return this.promise;
        }

        ns.log.debug('[ns.Update]', 'start()', this.id, 'layout', this.layout);

        var updated = this.view._getRequestViews({
            sync: [],
            async: []
        }, this.layout.views, this.params);

        ns.log.debug('[ns.Update]', 'start()', this.id, 'request views', updated);

        var that = this;

        var models = views2models(updated.sync);

        ns.log.debug('[ns.Update]', 'start()', this.id, 'models', models);

        // create promise for each async view
        var asyncUpdaterPromises = updated.async.map(function() {
            return new Vow.Promise();
        });

        var syncModelsPromise = ns.request.models(models)
            .then(function(models) {
                var error = null;
                models = models || [];

                if (that._expired()) {
                    error = {
                        error: that.STATUS.EXPIRED,
                        models: models
                    };
                } else if (models.some(function(m) { return !m.isValid(); })) {
                    error = {
                        error: that.STATUS.MODELS,
                        models: models
                    };
                }

                // Try handle error if any.
                if (error && !ns.Update.handleError(error, that)) {
                    that.error(error);
                    return;
                }

                if (that.options.renderOnly) {
                    that.done(that._render());
                } else {
                    that._update(async);
                    // resolve main promise and return promises for async views
                    that.done({
                        async: asyncUpdaterPromises
                    });
                }
            }, function(models) {
                // NOTE here we do not even try to handle the error. Or we should do it?
                that.error({
                    error: that.STATUS.MODELS,
                    models: models
                });
            })
            .fail(function(e) {
                that.error({
                    error: e,
                    models: models
                });
            });

        if (this.options.syncOnly) {
            return resultPromise;
        }

        // Для каждого async-view запрашиваем его модели.
        // Когда они приходят, запускаем точно такой же update.
        // Причем ждем отрисовку sync-view, чтобы точно запуститься после него.
        updated.async.forEach(function(view, asyncViewId) {
            var models = views2models( [ view ] );
            Vow.all([
                syncModelsPromise,
                ns.request.models(models)
            ]).then(function(result) {
                var models = result[1];
                //FIXME: we should delete this loop when ns.request will can reject promise
                // check that all models is valid
                for (var i = 0, j = models.length; i < j; i++) {
                    if (!models[i].isValid()) {
                        asyncUpdaterPromises[asyncViewId].reject({
                            error: that.STATUS.MODELS,
                            async_view: view,
                            models: models
                        });
                        return;
                    }
                }

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
                    layout[that.view.id] = that.layout;
                    params = that.params;
                }

                // pipes ns.Update promise to asyncPromise
                asyncUpdaterPromises[asyncViewId].sync(
                    new ns.Update(that.view, layout, params, {execFlag: ns.U.EXEC.ASYNC}).start(true)
                );

            }, function(result) {
                //FIXME: ns.request.models can't reject promise this time, we should fix it
                asyncUpdaterPromises[asyncViewId].reject({
                    error: that.STATUS.MODELS,
                    async_view: view,
                    models: result[1]
                });
            });
        });

        return resultPromise;
    };

    ns.Update.prototype._render = function() {
        var params = this.params;
        var layout = this.layout;

        var tree = {
            'views': {}
        };
        this.view._getUpdateTree(tree, layout.views, params);

        ns.log.debug('[ns.Update]', 'start()', this.id, 'updateTree', tree);

        // если пустое дерево, то ничего не реднерим,
        // но кидаем события и скрываем/открываем блоки
        var html;
        if (!ns.object.isEmpty(tree.views)) {
            html = this.render(tree, params, layout);
            ns.log.debug('[ns.Update]', 'start()', this.id, 'rendered html', html);
        }

        return html;
    };

    /**
     * Обновляет DOM и триггерит нужные события
     * @param {boolean} [async=false] Флаг асинхронного updater'а.
     * @private
     */
    ns.Update.prototype._update = function(async) {
        //  TODO: Проверить, что не начался уже более новый апдейт.

        var params = this.params;
        var layout = this.layout;

        var node;
        var html = this._render();
        if (html) {
            node = ns.html2node(html);
        }

        var viewEvents = {
            'ns-view-async': [],
            'ns-view-hide': [],
            'ns-view-htmldestroy': [],
            'ns-view-htmlinit': [],
            'ns-view-show': [],
            'ns-view-touch': []
        };

        this.view._updateHTML(node, layout.views, params, {
            toplevel: true,
            async: async
        }, viewEvents);

        for (var i = 0, j = this._EVENTS_ORDER.length; i < j; i++) {
            var event = this._EVENTS_ORDER[i];
            var views = viewEvents[event];
            for (var k = views.length - 1; k >= 0; k--) {
                views[k].trigger(event, params);
            }
        }
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
     * @returns {string}
     */
    ns.Update.prototype.render = function(tree, params, layout) {
        /* jshint unused: false */
        return ns.tmpl(tree, null, '');
    };

    /**
     * @returns {Boolean} true in case another update was created after current update.
     * @private
     */
    ns.Update.prototype._expired = function() {
        return this.stopped || currentUpdates.indexOf(this) === -1;
    };

    /**
     *
     */
    ns.Update.prototype.abort = function() {
        //TODO: Should we abort ns.request?

        /**
         * Flag that update was stopped.
         * @type {boolean}
         */
        this.stopped = true;

        // reject promise
        this.error({
            error: ns.U.STATUS.EXPIRED
        });
    };

    /**
     * @private
     * @param {*} result Result data.
     */
    ns.Update.prototype.done = function(result) {
        this.removeFromQueue();
        this.promise.fulfill(result);
    };

    /**
     * @private
     * @param {*} result Error data.
     */
    ns.Update.prototype.error = function(result) {
        this.removeFromQueue();
        this.promise.reject(result);
    };

    /**
     * @private
     */
    ns.Update.prototype.removeFromQueue = function() {
        var index = currentUpdates.indexOf(this);
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
     * @private
     * @param {ns.Update} newUpdate New instance of ns.Update.
     * @returns Boolean
     */
    ns.Update.prototype.addToQueue = function(newUpdate) {
        var currentRuns = currentUpdates;
        var FLAGS = ns.U.EXEC;
        var FLAG_GLOBAL = FLAGS.GLOBAL;
        var FLAG_PARALLEL = FLAGS.PARALLEL;
        var FLAG_ASYNC = FLAGS.ASYNC;

        var newRunExecutionFlag = newUpdate.execFlag;
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
                if (run.execFlag === FLAG_PARALLEL) {
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
                if (currentRuns[i].execFlag === FLAG_GLOBAL) {
                    return false;
                }
            }

        }

        currentUpdates.push(newUpdate);

        return true;
    };

    /**
     * Whether this update is a global update (main update) or not.
     * @returns Boolean.
     */
    ns.Update.prototype.isGlobal = function() {
        return this.execFlag === ns.U.EXEC.GLOBAL;
    };

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

})();
