(function() {

/**
 * Создает no.Update
 * @class no.Update
 * @param {no.View} view Корневой view.
 * @param {Object} layout Layout для этого view, результат от no.layout.page()
 * @param {Object} params Параметры, результат от no.router()
 * @constructor
 * @example
 * var route = no.router('/folder/123/message/456');
 * var layout = no.layout.page(route.page, route.params);
 * var update = new no.Update(AppBlock, layout, route.params);
 * update.start();
 */
no.Update = function(view, layout, params) {
    /**
     * Корневой view.
     * @private
     * @type {no.View}
     */
    this.view = view;

    // ищем layout от view
    if (this.view.id in layout) {
        this.layout = layout[this.view.id];

    } else {
        // если его нет - ругаемся
        throw "no.Update: can't find view layout";
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

//  ---------------------------------------------------------------------------------------------------------------  //

no.Update.prototype.start = function() {
    var resultPromise = new no.Promise();

    var updated = this.view._getRequestViews({
        sync: [],
        async: []
    }, this.layout.views, this.params);

    var that = this;

    var models = views2models(updated.sync);
    var promise = no.request.models(models)
        .then(function(r) {
            //TODO: check errors
            if (that._expired()) {
                resultPromise.reject();
            } else {
                that._update();
                //TODO: надо как-то закидывать ссылки на промисы от асинхронных view
                resultPromise.resolve();
            }
        });

    // Для каждого lazy-view запрашиваем его модели.
    // Когда они приходят, запускаем точно такой же update.
    updated.async.forEach(function(view) {
        var models = views2models( [ view ] );
        no.Promise.wait([
            promise,
            no.request.models(models)
        ]).then(function(r) {
            //TODO: смотреть, что не запустился другой update
            if (!that._expired()) {
                var fakeLayout = {};
                fakeLayout[that.view.id] = that.layout;
                new no.Update(that.view, fakeLayout, that.params).start();
            }
        });
    });

    return resultPromise;
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.Update.prototype._update = function(async) {
    //  TODO: Проверить, что не начался уже более новый апдейт.

    var params = this.params;
    var layout = this.layout;

    var tree = {
        'location': document.location,
        'layout-params': params,
        'views': {}
    };
    this.view._getUpdateTree(tree, layout.views, params);

    //TODO: detect if empty
    if ( no.object.isEmpty(tree.views) ) {
        no.todo();
        // return;
    }

    var html = no.tmpl(tree, null, '');
    var node = no.html2node(html);
    this.view._updateHTML(node, layout.views, params, {
        toplevel: true,
        async: async
    });
};

//  ---------------------------------------------------------------------------------------------------------------  //

/**
 * @return {Boolean} true in case another update was created after current update.
 * @private
 */
no.Update.prototype._expired = function() {
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

