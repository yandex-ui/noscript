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

no.Box.prototype._getUpdated = function(updated, layout, params, toplevel) {
    if (!toplevel) {
        updated.push({
            view: this,
            layout: layout,
            toplevel: toplevel
        });
    }

    var views = this.views;
    for (var id in layout) {
        var view = this._addView(id, params);
        view._getUpdated(updated, layout[id], params, toplevel);
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.Box.prototype._getTemplateTree = function(layout, params) {
    var tree = {};

    var views = this.views;
    for (var id in layout) {
        var key = no.View.getKey(id, params);
        tree[id] = views[key]._getTemplateTree( layout[id], params );
    }

    return tree;
};

