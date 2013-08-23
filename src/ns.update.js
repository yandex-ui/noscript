(function() {

/**
 * Создает ns.Update
 * @class ns.Update
 * @param {ns.View} view Корневой view.
 * @param {Object} layout Layout для этого view, результат от ns.layout.page()
 * @param {Object} params Параметры, результат от ns.router()
 * @param {Object} [options] Options for ns.Update
 * @param {ns.U.EXEC} [options.execFlag=ns.U.EXEC.GLOBAL] Options for ns.Update
 * @constructor
 * @example
 * var route = ns.router('/folder/123/message/456');
 * var layout = ns.layout.page(route.page, route.params);
 * var update = new ns.Update(AppBlock, layout, route.params);
 * update.start();
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

    options = options || {};

    /**
     * Execution flag
     * @type {ns.U.EXEC}
     */
    this.EXEC_FLAG = options.execFlag || ns.U.EXEC.GLOBAL;
};

/**
 * Current ns.Updates.
 * @type ns.Update[]
 * @private
 */
var currentUpdates = [];

/**
 * Id последнего созданного update-а.
 * @type {Number}
 */
var update_id = -1;

/**
 * @see ns.U.STATUS
 * @enum {Number}
 * @borrows ns.U.STATUS as ns.Update.prototype.STATUS
 */
ns.Update.prototype.STATUS = ns.U.STATUS;

/**
 * Порядок событий для View.
 * @type {Array}
 * @private
 */
ns.Update.prototype._EVENTS_ORDER = ['ns-view-hide', 'ns-view-htmldestroy', 'ns-view-htmlinit', 'ns-view-async', 'ns-view-show', 'ns-view-repaint'];

/**
 * Начинает работу updater'а.
 * @param [async=false] Флаг асинхронного updater'а.
 * @return {no.Promise}
 */
ns.Update.prototype.start = function(async) {
    var resultPromise = new no.Promise();
    this.promise = resultPromise;

    if (!this.addToQueue(this)) {
        this.abort();
        return this.promise;
    }

    var updated = this.view._getRequestViews({
        sync: [],
        async: []
    }, this.layout.views, this.params);

    var that = this;

    var models = views2models(updated.sync);

    // create promise for each async view
    var asyncUpdaterPromises = updated.async.map(function() {
        return new no.Promise();
    });

    var syncModelsPromise = ns.request.models(models)
        .done(function(models) {
            if (that._expired()) {
                that.error({
                    error: that.STATUS.EXPIRED
                });

            } else {
                //FIXME: we should delete this loop when ns.request will can reject promise
                // check that all models is valid
                for (var i = 0, j = models.length; i < j; i++) {
                    if (!models[i].isValid()) {
                        that.error({
                            error: that.STATUS.MODELS,
                            models: models
                        });
                        return;
                    }
                }

                that._update(async);
                // resolve main promise and return promises for async views
                that.done({
                    async: asyncUpdaterPromises
                });
            }
        })
        .fail(function(models) {
            //FIXME: ns.request.models can't reject promise this time, we should fix it
            that.error({
                error: that.STATUS.MODELS,
                models: models
            });
        });

    // Для каждого async-view запрашиваем его модели.
    // Когда они приходят, запускаем точно такой же update.
    // Причем ждем отрисовку sync-view, чтобы точно запуститься после него.
    updated.async.forEach(function(view, asyncViewId) {
        var models = views2models( [ view ] );
        no.Promise.wait([
            syncModelsPromise,
            ns.request.models(models)
        ]).done(function(result) {
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

            new ns.Update(that.view, layout, params, {execFlag: ns.U.EXEC.ASYNC})
                .start(true)
                // pipes ns.Update promise to asyncPromise
                .pipe(asyncUpdaterPromises[asyncViewId]);

        }).fail(function(result) {
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

/**
 * Обновляет DOM и триггерит нужные события
 * @param [async=false] Флаг асинхронного updater'а.
 * @private
 */
ns.Update.prototype._update = function(async) {
    //  TODO: Проверить, что не начался уже более новый апдейт.

    var params = this.params;
    var layout = this.layout;

    var tree = {
        'location': document.location,
        'layout-params': params,
        'views': {}
    };
    this.view._getUpdateTree(tree, layout.views, params);

    ns.log.debug('[ns.Update]', 'start()', this.id, 'updateTree', tree);

    var node;
    // если пустое дерево, то ничего не реднерим,
    // но кидаем события и скрываем/открываем блоки
    if (!ns.object.isEmpty(tree.views)) {
        node = ns.tmpl(tree, null, '');
        ns.log.debug('[ns.Update]', 'start()', this.id, 'new node', node.cloneNode(true));
    }

    var viewEvents = {
        'ns-view-async': [],
        'ns-view-hide': [],
        'ns-view-htmldestroy': [],
        'ns-view-htmlinit': [],
        'ns-view-show': [],
        'ns-view-repaint': []
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

//  ---------------------------------------------------------------------------------------------------------------  //

/**
 * @return {Boolean} true in case another update was created after current update.
 * @private
 */
ns.Update.prototype._expired = function() {
    return this.stopped || currentUpdates.indexOf(this) === -1;
};

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
 * @param result
 */
ns.Update.prototype.done = function(result) {
    this.removeFromQueue();
    this.promise.resolve(result);
};

/**
 * @private
 * @param result
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

    var newRunExecutionFlag = newUpdate.EXEC_FLAG;
    var i,j;

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

// ----------------------------------------------------------------------------------------------------------------- //

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

