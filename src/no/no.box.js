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

no.Box.prototype._getActiveViews = function(views) {
    var views = this.views;
    var active = this.active;

    for (var key in active) {
        var view = views[key];
        views.push(view);
        view._getActiveViews(views);
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Ищем все новые блоки и блоки, требующие перерисовки.
no.Box.prototype._getRequestViews = function(updated, layout, params) {
    var views = this.views;
    for (var id in layout) {
        //  Согласно новому layout'у здесь должен быть view с id/params.
        //  Создаем его (если он уже есть, он возьмется из this.views).
        var view = this._addView(id, params);
        //  Идем вниз рекурсивно.
        view._getRequestViews(updated, layout[id], params);
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Боксы всегда валидные, т.е. не toplevel, поэтому просто идем вниз по дереву.
no.Box.prototype._getUpdateTree = function(tree, layout, params) {
    var views = this.views;
    for (var id in layout) {
        var key = no.View.getKey(id, params);
        views[key]._getUpdateTree(tree, layout[id], params);
    }
};

//  Строим дерево блоков.
no.Box.prototype._getViewTree = function(models, layout, params) {
    //  Для бокса это всегда объект (возможно, пустой).
    var tree = {};

    var views = this.views;
    for (var id in layout) {
        var key = no.View.getKey(id, params);
        tree[id] = views[key]._getViewTree(models, layout[id], params);
    }

    return tree;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Обновляем бокс.
no.Box.prototype._updateHTML = function(node, layout, params, toplevel) {
    if (!this.node) {
        //  Ищем новую ноду бокса.
        this.node = no.byClass('box-' + this.id, node)[0];
    }

    var views = this.views;

    //  this.active -- это объект (упорядоченный!), в котором лежат ключи
    //  активных (видимых) в данный момент блоков.
    var oldActive = this.active;
    var newActive = {};

    //  Строим новый active.
    for (var id in layout) {
        var key = no.View.getKey(id, params);
        newActive[key] = true;

        //  Достаем ранее созданный блок (в _getRequestViews).
        var view = views[key];

        //  Обновляем его.
        view._updateHTML(node, layout[id], params, toplevel);

        //  Показываем его.
        view._show();
        //  Выстраиваем новые активные блоки в нужном порядке.
        //  Плюс, если это новый блок, подклеиваем его к боксу.
        this.node.appendChild(view.node);
    }

    //  Прячем все блоки, которые были активны, но перестали после этого апдейта.
    for (var key in oldActive) {
        if ( !newActive[key] ) {
            var subviews = views[key]._getActiveViews();
            //  FIXME: Может тут нужно в обратном порядке прятать блоки?
            for (var i = 0, l = subviews.length; i < l; i++) {
                subviews[i]._hide();
            }
        }
    }

    //  Запоминаем новый active.
    this.active = newActive;
};

