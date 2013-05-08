(function() {

/**
 * Создает ns.Update
 * @class ns.Update
 * @param {ns.View} view Корневой view.
 * @param {Object} layout Layout для этого view, результат от ns.layout.page()
 * @param {Object} params Параметры, результат от ns.router()
 * @constructor
 * @example
 * var route = ns.router('/folder/123/message/456');
 * var layout = ns.layout.page(route.page, route.params);
 * var update = new ns.Update(AppBlock, layout, route.params);
 * update.start();
 */
ns.Update = function(view, layout, params) {
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
        throw new Error("ns.Update: can't find view layout");
    }

    this.params = params;

    this.id = ++update_id;
};

//  ---------------------------------------------------------------------------------------------------------------  //

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
ns.Update.prototype._EVENTS_ORDER = ['ns-hide', 'ns-htmldestroy', 'ns-htmlinit', 'ns-async', 'ns-show', 'ns-repaint'];

/**
 * Начинает работу updater'а.
 * @param [async=false] Флаг асинхронного updater'а.
 * @return {no.Promise}
 */
ns.Update.prototype.start = function(async) {
    var resultPromise = new no.Promise();

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
                resultPromise.reject({
                    error: that.STATUS.EXPIRED
                });

            } else {
                //FIXME: we should delete this loop when ns.request will can reject promise
                // check that all models is valid
                for (var i = 0, j = models.length; i < j; i++) {
                    if (!models[i].isValid()) {
                        resultPromise.reject({
                            error: that.STATUS.MODELS,
                            models: models
                        });
                        return;
                    }
                }

                that._update(async);
                // resolve main promise and return promises for async views
                resultPromise.resolve({
                    async: asyncUpdaterPromises
                });
            }
        })
        .fail(function(models) {
            //FIXME: ns.request.models can't reject promise this time, we should fix it
            resultPromise.reject({
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

            if (!that._expired()) {
                var fakeLayout = {};
                fakeLayout[that.view.id] = that.layout;
                new ns.Update(that.view, fakeLayout, that.params)
                    .start(true)
                    // pipes ns.Update promise to asyncPromise
                    .pipe(asyncUpdaterPromises[asyncViewId]);

            } else {
                asyncUpdaterPromises[asyncViewId].reject({
                    error: that.STATUS.EXPIRED,
                    async_view: view
                });
            }
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

    var node;
    // если пустое дерево, то ничего не реднерим,
    // но кидаем события и скрываем/открываем блоки
    if (!ns.object.isEmpty(tree.views)) {
        node = ns.tmpl(tree, null, '');
    }

    var viewEvents = {
        'ns-async': [],
        'ns-hide': [],
        'ns-htmldestroy': [],
        'ns-htmlinit': [],
        'ns-show': [],
        'ns-repaint': []
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
    var expired = this.id < update_id;
    return expired;
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

