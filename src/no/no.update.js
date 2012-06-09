(function() {

//  ---------------------------------------------------------------------------------------------------------------  //
//  no.Update
//  ---------------------------------------------------------------------------------------------------------------  //

no.Update = function(view, layout, params) {
    this.view = view;
    this.layout = layout;
    this.params = params;

    this.id = update_id++;
};

//  ---------------------------------------------------------------------------------------------------------------  //

var update_id = 0;

//  ---------------------------------------------------------------------------------------------------------------  //

no.Update.prototype.start = function() {
    var updated = this.updated = this.view._getUpdated( [], this.layout, this.params, true );

    var sync = [];
    var async = [];
    for (var i = 0, l = updated.length; i < l; i++) {
        var item = updated[i];
        //  FIXME: Убрать false, использовать только внятные константы.
        if (item.layout === 'async' || item.layout === false) {
            async.push(item.view);
        } else {
            sync.push(item.view);
        }
    }

    var that = this;

    var promise = no.requestModels( no.View.views2models(sync) ).then(function(r) {
        console.log('done', r);
        //  that.update(that.view);
    });

    async.forEach(function(view) {
        var models = no.View.views2models( [ view ] );
        no.Promise.wait([
            promise,
            no.requestModels(models)
        ]).then(function(r) {
            console.log('done', r);
            //  that.update(view);
        });
    });

};

//  ---------------------------------------------------------------------------------------------------------------  //

no.Update.prototype.update = function() {
};

//  ---------------------------------------------------------------------------------------------------------------  //

/*
no.View.prototype._update = function() {
    var tree = this._templateTree(...);
    var html = Yater.run(tree, null, '');
    var node = html2node(html);
    this._updateTree(node, true);
};

no.View.prototype._updateTree = function(node, toplevel) {
    if ( !this.isValid() ) {

    } else {

    }
};

no.Box.prototype._updateTree = function(node, toplevel) {

};

no.View.prototype._templateTree = function(layout, models) {
    var data = {};
    for (var i = 0, l = models.length; i < l; i++) {
        var model = models[i];
        data[model.id] = model.getData();
    }

    return {
        views: layout,
        data: data
    };
};

//  Удаляет рекурсивно все блоки со статусом none/loading.
no.View.prototype._cleanup = function() {

};
*/

//  ---------------------------------------------------------------------------------------------------------------  //



})();

//  ---------------------------------------------------------------------------------------------------------------  //
//  ---------------------------------------------------------------------------------------------------------------  //
//  ---------------------------------------------------------------------------------------------------------------  //
//  ---------------------------------------------------------------------------------------------------------------  //
//  ---------------------------------------------------------------------------------------------------------------  //

/*
no.Update = function(layoutId, pageRootView, params) {
    this.id = no.Update.id++;

    // @type Object.<string, no.Request>
    this.queue = {};

    this.layout_id = layoutId;
    this.view = pageRootView;
    this.params = params;

    this.layout = no.layout.get(this.layout_id);
    this.createRequests();
};

no.extend(no.Update.prototype, no.Events);

no.Update.id = 0;

no.Update.prototype.start = function() {
    this.requestMore();
};

//  ---------------------------------------------------------------------------------------------------------------  //

// ----------------------------------------------------------------------------------------------------------------- //

no.Update.prototype.createRequests = function() {
    var that = this;
    var tree = this.tree = no.View.getLayoutTree(this.view.id, this);
    var main_models = []; // Main request models list.

    no.Update.walkLeafs(tree, function(view_id, type) {
        var view_info = no.View.info(view_id);
        var models = view_info.models;
        if (view_info.async) {
            that.createRequest4Async(view_id);
        } else {
            main_models = main_models.concat(models);
        }
    });

    this.createMainRequest(no.array.uniq(main_models));
};

// ----------------------------------------------------------------------------------------------------------------- //

no.Update.prototype.createRequest4Async = function(viewId) {
    var that = this;

    var group = this._createGroup(viewId);
    if (!group) {
        return;
    }

    var request = new no.Request([ group ], false);

    request.on("gotData", function() { // После каждой очередной порции данных - пытаемся запросить ещё данных.
        that.requestMore();
    });

    this.queue[viewId] = request;

    request.promise.then(function() {
        // Remove request from queue when done.
        // "All done" check will be done in gotData handler.
        delete that.queue[viewId];

        that.page_ready.then(function() {
            var view = no.View.get(viewId, that.params);
            if (view) {
                view.invalidate();
            }
            that.updateView(viewId, request);
        });
    });
};

// ----------------------------------------------------------------------------------------------------------------- //

no.Update.prototype.createMainRequest = function(models) {
    var that = this;
    var viewId = this.view.id;
    var page_redraw_promise = new no.Promise();
    var request = new no.Request([ { models: models, params: this.params } ], false);

    this.page_ready = no.Promise.wait([
        request.promise, // Got main page data.
        page_redraw_promise // Page main blocks were drawn (main page redraw promise).
    ]);

    request.on("gotData", function() { // После каждой очередной порции данных - пытаемся запросить ещё данных.
        that.requestMore();
    });

    this.queue[viewId] = request;

    request.promise.then(function() {
        // Remove request from queue when done.
        // "All done" check will be done in gotData handler.
        delete that.queue[viewId];

        that.updateView(that.view, request); // Update main page view.
        page_redraw_promise.resolve(); // Resolve main page redraw promise.
    });
};

// ----------------------------------------------------------------------------------------------------------------- //

no.Update.walkLeafs = function(obj, callback) {
    no.object.forEach(obj, function(value, key) {
        if (typeof value !== 'object') {
            callback(key, value);
        } else {
            no.Update.walkLeafs(value, callback);
        }
    });
};

// ----------------------------------------------------------------------------------------------------------------- //

no.Update.prototype.updateView = function(view, request) {
    if (typeof view === "string") {
        view = no.View.get(view, this.params);
    }

    var viewsTree = [];
    view.getUpdateTrees(this, viewsTree);

    var tree = {
        models: {},
        params: this.params,
        views: viewsTree,
        location: document.location
    };

    var models = tree.models;

    var groups = request.groups;
    for (var i = 0, l = groups.length; i < l; i++) {
        var group = groups[i];
        for (var j = 0, m = group.models.length; j < m; j++) {
            var model_id = group.models[j];
            models[model_id] = no.Model.get(model_id, group.params).data;
        }
    }

    var html = Yater.run( tree ); // FIXME: Нужно проверять, что update не нужен и ничего не делать.
    var div = document.createElement('div');
    div.innerHTML = html;

    var node = div.firstChild;
    this.updateHtml(view, node);
};

// ----------------------------------------------------------------------------------------------------------------- //

no.Update.prototype.updateHtml = function(view, node) {
    var that = this;
    view.processTree(function(view) {
        if (view.needUpdate(that)) {
            view.update(node, that, true);
            return false;
        }
    });
};

// ----------------------------------------------------------------------------------------------------------------- //

no.Update.prototype.requestMore = function() {
    var all_done = true; // this update has nothing more to do.

    no.object.forEach(this.queue, function(request, view_id) {
        if (request.status === "active") { // this request is active, waiting for response.
            all_done = false;
        }

        if (request.send()) { // Could request more models.
            all_done = false;
        }
    });

    if (all_done) {
        no.object.forEach(this.queue, function(request, view_id) {
            // Waiting requests must be terminated.
            if (request.status === "waiting") {
                request.promise.resolve();
            }
        });

        this.trigger("done"); // XXX all rendered?
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

no.Update.prototype._createGroup = function(viewId) {
    var info = no.View.info(viewId);
    if (info.models.length === 0) {
        return null;
    }

    return {
        models: info.models,
        params: this.params
    };
};
*/

