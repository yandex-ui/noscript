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
    this.createRequests(); // This is main page request.
};

/** @type {number} */
no.Update.id = 0;

no.Update.prototype.start = function() {
    this.requestMore();
};

/**
    Add async view in update list.
*/
no.Update.prototype.addAsync = function(viewId) {
    this.createRequest(viewId);
};

// ----------------------------------------------------------------------------------------------------------------- //

no.Update.prototype.createRequest = function(viewId) {
    var that = this;

    var request = new no.Request([ this._createGroup(viewId) ]);

    request.on("gotData", function() { // После каждой очередной порции данных - пытаемся запросить ещё данных.
        that.requestMore();
    });

    this.queue[viewId] = request;

    request.promise.then(function() {
        // Remove request from queue when done.
        // "All done" check will be done in gotData handler.
        delete that.queue[viewId];

        that.page_ready.then(function() {
            that.updateView(viewId, request);
        });
    });
};

no.Update.prototype.createRequests = function() {
    var that = this;
    var tree = this.tree = no.View.getLayoutTree(this.view.id, this);
    var main_models = []; // Main request models list.

    no.Update.walkLeafs(tree, function(view_id, type) {
        var view_info = no.View.info(view_id);
        var models = view_info.models;
        if (view_info.async) {
            that.addAsync(view_id);
        } else {
            no.array.append(main_models, models);
        }
    });

    this.createMainRequest(main_models);
};

no.Update.prototype.createMainRequest = function(models) {
    var that = this;
    var page_redraw_promise = new no.Promise();
    var request = new no.Request([ { models: models, params: this.params } ]);

    this.page_ready = no.Promise.wait(
        request.promise, // Got main page data.
        page_ready_promise // Page main blocks were drawn.
    );

    request.on("gotData", function() { // После каждой очередной порции данных - пытаемся запросить ещё данных.
        that.requestMore();
    });

    this.queue[this.view.id] = request;

    request.promise.then(function() {
        // Remove request from queue when done.
        // "All done" check will be done in gotData handler.
        delete that.queue[viewId];

        that.updateView(viewId, request); // Update main page view.
        page_redraw_promise.resolve();
    });
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {!Object} obj
    @param {function} callback
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
        view = no.View.get(view, request.params);
    }

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
    // TODO Check, if something was requested
    // When all done - notify about it.

    no.object.forEach(this.queue, function(request, view_id) {

    });
};

// ----------------------------------------------------------------------------------------------------------------- //

no.Update.prototype._createGroup = function(viewId) {
    var info = no.View.info(viewId);
    return {
        models: info.models,
        params: this.params
    };
};
