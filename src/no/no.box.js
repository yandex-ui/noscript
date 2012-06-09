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
    this.active = null;
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

//  ---------------------------------------------------------------------------------------------------------------  //

no.Box.prototype._getUpdated = function(updated, layout, params, toplevel) {
    var views = this.views;

    for (var id in layout) {
        var view = this._addView(id, params);
        view._getUpdated(updated, layout[id], params, toplevel);
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //


/*
no.Box.prototype.update = function(node, update) {
    if (!this.status) {
        node = no.byClass('box-' + this.id, node)[0];
        if (!node) { return; }

        this.node = node;
        this.status = true;
    }

    var params = update.params;
    var archive = this.archive;

    // Свежесозданный box. Создаем актуальный current -- список блоков, которые в нем лежат в данный момент.
    // А это те блоки, которые сгенерились в html'е.
    // Они могут быть:
    //   - не все, что положены по layout'у;
    //   - в неправильном порядке (из-за того, что хэши в javascript'е не упорядоченные, вообще говоря).
    // Поэтому приходится смотреть, что же там сгенерилось и в каком порядке.
    // Дальше, если порядок неправильный, блоки будут переставлены в нужном порядке дальше, в updateCurrent().

    if (!this.current) {
        var current = [];
        var children = node.children; // FIXME: node.children не работает в FF3.0.

        for (var i = 0, l = children.length; i < l; i++) {
            var child = children[i];
            var className = child.className;
            var r = className.match(/\bview-(\S+)\b/);
            if (r) {
                var view_id = r[1];

                var key = no.View.getKey(view_id, params);
                current.push(key);

                var view = archive[key] = this.subView(view_id, params);
                view.update(this.node, update, false); // FIXME: Плохо, что child уже найден, а передаем мы node.
            }
        }

        this.current = current;
    }

    this.updateCurrent(node, update);

};

no.Box.prototype.updateCurrent = function(node, update) {
    var params = update.params;

    var archive = this.archive;

    var views = update.layout[ this.parent.id ][ this.id ];
    var content = no.View.ids2keys(views, params);
    var contentKeys = no.array.toObject(content);

    var current = no.array.grep(this.current, function(key) { // Проходим по текущему контенту и прячем все блоки, которые не должны отображаться в текущем layout.
        if (!(key in contentKeys)) {
            archive[key].hide();
            return false;
        }
        return true;
    });

    for (var i = 0, l = views.length; i < l; i++) {
        var view_id = views[i];
        var key = content[i];

        var view = archive[key];
        if (!view) {
            view = archive[key] = this.subView(view_id, params);
        }
        if (view.needUpdate()) {
            view.update(node, update);
        }
        view.show();

        this.node.appendChild(view.node);
    }

    this.current = content;
};
*/

// ----------------------------------------------------------------------------------------------------------------- //


/*
no.Box.prototype.getUpdateTrees = function(update, trees) {
    var archive = this.archive;
    var params = update.params;

    var views = update.layout[ this.parent.id ][ this.id ];
    var content = no.View.ids2keys(views, update.params);

    for (var i = 0, l = content.length; i < l; i++) {
        var view_id = views[i];
        var key = content[i];
        var view = archive[key];
        if (!archive[key]) {
            view = this.subView( view_id, params );
        }
        view.getUpdateTrees(update, trees);
    }
};
*/

// ----------------------------------------------------------------------------------------------------------------- //

