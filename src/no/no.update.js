/**
    Usage:
    var update = new no.Update(pageinfo.layoutId, appView, pageinfo.params);

    @param {string} layoutId Current layout id. Initially it current page layout id.
    @param {no.View} pageRootView Start view for update. Currenty, it is app view.
    @param {Object} params Update params. Initially these are page params from URL.
*/
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

/** @type {number} */
no.Update.id = 0;

no.Update.prototype.start = function() {
    this.requestMore();
};

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

/**
    Create request for async view.
*/
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

/**
    Creates a request for all !async blocks for main update view.
    @param {Array.<string>} models Model ids for !async blocks.
*/
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

/**
    @param {!Object} obj Target object to go through its properties.
    @param {function} callback A callback, called only on leaf properties (primitive types, !object).
*/
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

/**
    @param {no.View|no.Box|string} view View instance or view id, to find it.
*/
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

/**
    @param {no.View|no.Box} view View / box, which html must be updated.
    @param {Element} node Generated html.
*/
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
