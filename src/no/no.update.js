/**
    @constructor
    @param {no.View} view
    @param {string} layout_id
    @param {Object} params
*/
no.Update = function(view, layout_id, params) {
    this.id = no.Update.id++;

    this.view = view;
    this.layout_id = layout_id;
    this.params = params;

    this.layout = no.layout.get( layout_id );

    this.prepare();
    this.request();
};

/** @type {number} */
no.Update.id = 0;

// ----------------------------------------------------------------------------------------------------------------- //

no.Update.prototype.prepare = function() {
    this.requests = {};

    var tree = this.tree = no.View.getLayoutTree( this.view.id, this );

    var params = this.params;

    var that = this;
    no.Update.walkLeafs(tree, function(view_id, type) {
        var view_info = no.View.info( view_id );
        var models = view_info.models;
        if (view_info.async) {
            that.createAsyncViewRequest(new no.View(view_id, params), models, params);
        } else {
            that.addItemsToMainRequest(models, params);
        }
    });
};

/**
    @param {!Object} obj
    @param {function} callback
*/
no.Update.walkLeafs = function(obj, callback) {
    for (var key in obj) {
        var value = obj[key];
        if (typeof value !== 'object') {
            callback(key, value);
        } else {
            no.Update.walkLeafs(value, callback);
        }
    }
};

/**
    @param {Array.<string>} model_ids Model identifiers.
    @param {Object} params Model get params.
*/
no.Update.prototype.addItemsToMainRequest = function(model_ids, params) {
    var request_id = "all";
    var request = this.requests[request_id];
    if (!request) {
        request = ((this.requests[request_id] = { models: [], params: {} } ));
    }

    request.models = request.models.concat(model_ids);
    no.extend(request.params, params); // Расширяем параметры для запроса моделей.
};

/**
    @param {no.View} view View instance.
    @param {Object} params Model get params.
*/
no.Update.prototype.createAsyncViewRequest = function(view, params) {
    var request = {
        view: view,
        models: view.info.models,
        params: no.extend({}, params)
    };
    var request_id = view.getKey(); // Использует view_id в качестве id запроса, чтобы избежать конфликтов с другими запросами.
    this.requests[request_id] = request;
};

// ----------------------------------------------------------------------------------------------------------------- //

no.Update.prototype.request = function() {
    var that = this;
    var requests = this.requests;
    var main_request = new no.Request([ requests.all ]);

    // Вначале запускаем основной запрос, потом идут остальные.
    main_request
        .start()
        .then(function() {
            that.render(that.view, main_request);
        })
        .then(function() {
            var keys = no.object.keys(requests);
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                if (key === "all") {
                    continue;
                }

                // Создаём no.Request на каждый асинхронный блок.
                (function(req) {
                    var async = new no.Request([ req ]);
                    var view = req.view;
                    async
                        .start()
                        .then(function() {
                            that.render(view, async);
                        });
                })(requests[key]);
            }
        });
};

no.Update.prototype.render = function(view, request) {
    var groups = request.groups;
    var viewsTree = [];
    view.getUpdateTrees(this, viewsTree);

    var tree = {
        views: viewsTree,
        models: {},
        params: {}
    };
    var models = tree.models;
    var params = tree.params;
    for (var i = 0, l = groups.length; i < l; i++) {
        var group = groups[i];
        for (var j = 0, m = group.models.length; j < m; j++) {
            var model_id = group.models[j];
            var key = no.Model.key(model_id, group.params);
            models[model_id] = no.Model.get(model_id, key).data;
            params[model_id] = group.params;
        }
    }

    // console.time('template');
    var html = stylesheet( tree ); // FIXME: Нужно проверять, что update не нужен и ничего не делать.
    // console.timeEnd('template');
    var div = document.createElement('div');
    div.innerHTML = html;

    var node = div.firstChild;
    this.update(view, node);
}

/**
    @param {Element} node
*/
no.Update.prototype.update = function(root_view, node) {
    /*
    if (this.canceled || this.id < no.Update.id) { // Запущен какой-то новый update, этот выполнять уже ненужно.
        return;
    }
    */

    /*
    if (!this.hasAllData()) {
        // ERROR.
        return;
    }
    */


    var that = this;
    root_view.processTree(function(view) {
        if (view.needUpdate(that)) {
            view.update(node, that, !!view.node); // Может быть у нас ещё нет ноды, вообще говоря. Как в случае с comments.
            return false;
        }
    });
};

// ----------------------------------------------------------------------------------------------------------------- //

