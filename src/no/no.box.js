//  ---------------------------------------------------------------------------------------------------------------  //
//  no.Box
//  ---------------------------------------------------------------------------------------------------------------  //

no.Box = function(id, params) {
    this.id = id;
    this.params = params;

    this.views = {};

    //  NOTE: Нет специального метода no.Box.getKey --
    //  все ключи вычисляются только через no.View.getKey.
    this.key = no.View.getKey(id, params);

    this.node = null;
    this.active = {};
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.Box.prototype._getView = function(id, params) {
    var key = no.View.getKey(id, params);
    return this.views[key];
};

no.Box.prototype._addView = function(id, params) {
    var view = this._getView(id, params);
    if (!view) {
        view = no.View.create(id, params);
        this.views[view.key] = view;
    }
    return view;
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.Box.prototype.activate = function(views) {
    //  TODO
};

//  ---------------------------------------------------------------------------------------------------------------  //

/*
no.Box.prototype.walk = function(callback, params) {
    var active = this.active;

    if (active) {
        var views = this.views;

        for (var i = 0, l = active.length; i < l; i++) {
            var view = views[ active[i] ];
            view.walk(callback, params);
        }
    }
};
*/

//  ---------------------------------------------------------------------------------------------------------------  //

no.Box.prototype._getRequestViews = function(updated, layout, params) {
    var views = this.views;
    for (var id in layout) {
        var view = this._addView(id, params);
        view._getRequestViews(updated, layout[id], params);
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.Box.prototype._getUpdateTree = function(tree, layout, params) {
    var views = this.views;
    for (var id in layout) {
        var key = no.View.getKey(id, params);
        views[key]._getUpdateTree(tree, layout[id], params);
    }
};

no.Box.prototype._getViewTree = function(models, layout, params) {
    var tree = {};

    var views = this.views;
    for (var id in layout) {
        var key = no.View.getKey(id, params);
        tree[id] = views[key]._getViewTree(models, layout[id], params);
    }

    return tree;
};

no.Box.prototype._updateHTML = function(node, layout, params, toplevel) {
    if (!this.node) {
        this.node = no.byClass('box-' + this.id, node)[0];
    }

    var views = this.views;

    var newActive = {};
    for (var id in layout) {
        var key = no.View.getKey(id, params);
        newActive[key] = true;
        views[key]._updateHTML(node, layout[id], params, toplevel);
    }

    var oldActive = this.active;
    for (var key in oldActive) {
        if ( !(key in newActive) ) {
            views[key]._hide();
        }
    }

    for (var key in newActive) {
        if ( !(key in oldActive) ) {
            views[key]._show();
        }
    }

    this.active = newActive;
};

