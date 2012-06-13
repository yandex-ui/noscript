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

//  ---------------------------------------------------------------------------------------------------------------  //

no.Box.prototype._updateHTML = function(node, layout, params, toplevel) {
    if (!this.node) {
        this.node = no.byClass('box-' + this.id, node)[0];
    }

    var views = this.views;

    var newActive = {};
    var oldActive = this.active;

    for (var id in layout) {
        var key = no.View.getKey(id, params);
        newActive[key] = true;

        var view = views[key];

        view._updateHTML(node, layout[id], params, toplevel);

        if ( layout[id] === 'hide' ) {
            view._hide();
        } else {
            view._show();
            this.node.appendChild(view.node);
        }
    }

    for (var key in oldActive) {
        if ( !newActive[key] ) {
            views[key]._hide();
        }
    }

    this.active = newActive;
};

