/**
 * @class Box - это тип View, который умеет выбирать какие View показывать.
 * @param id
 * @param params
 * @constructor
 */
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

no.Box.prototype._getDescendants = function(descs) {
    var views = this.views;
    var active = this.active;

    for (var id in active) {
        var view = views[ active[id] ];
        descs.push(view);
        view._getDescendants(descs);
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Ищем все новые блоки и блоки, требующие перерисовки.
no.Box.prototype._getRequestViews = function(updated, layout, params) {
    for (var id in layout) {
        //  Согласно новому layout'у здесь должен быть view с id/params.
        //  Создаем его (если он уже есть, он возьмется из this.views).
        var view = this._addView(id, params);
        //  Идем вниз рекурсивно.
        view._getRequestViews(updated, layout[id].views, params);
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Боксы всегда валидные, т.е. не toplevel, поэтому просто идем вниз по дереву.
no.Box.prototype._getUpdateTree = function(tree, layout, params) {
    var views = this.views;
    for (var id in layout) {
        var key = no.View.getKey(id, params);
        views[key]._getUpdateTree(tree, layout[id].views, params);
    }
};

//  Строим дерево блоков.
no.Box.prototype._getViewTree = function(models, layout, params) {
    //  Для бокса это всегда объект (возможно, пустой).
    var tree = {
        box: true,
        views: {}
    };

    var views = this.views;
    for (var id in layout) {
        var key = no.View.getKey(id, params);
        tree.views[id] = views[key]._getViewTree(models, layout[id].views, params);
    }

    return tree;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Обновляем бокс.
no.Box.prototype._updateHTML = function(node, layout, params, options) {
    if (!this.node) {
        //  Ищем новую ноду бокса.
        this.node = no.byClass('view-' + this.id, node)[0];
    }

    var views = this.views;

    //  this.active -- это объект (упорядоченный!), в котором лежат ключи
    //  активных (видимых) в данный момент блоков.
    var oldActive = this.active;
    var layoutActive = {};

    //  Строим новый active согласно layout'у.
    //  Т.е. это тот набор блоков, которые должны быть видимы в боксе после окончания всего апдейта
    //  (включая синхронную и все асинхронные подапдейты).
    for (var id in layout) {
        var key = no.View.getKey(id, params);
        layoutActive[id] = key;

        //  Достаем ранее созданный блок (в _getRequestViews).
        var view = views[key];

        //  Обновляем его.
        view._updateHTML(node, layout[id].views, params, options);

        if ( view.isOk() ) {
            //  Выстраиваем новые активные блоки в нужном порядке.
            //  Плюс, если это новый блок, подклеиваем его к боксу.
            this.node.appendChild(view.node);
        }
    }

    //  Строим новый active, но уже не по layout'у,
    //  а по актуальным блокам. В частности, заглушки в новый active не попадают.
    //  Вместо них берем старые блоки, если они были.
    var newActive = {};
    for (var id in layoutActive) {
        var key = layoutActive[id];

        if ( views[key].isLoading() ) {
            key = oldActive[id];
            if (key) {
                newActive[id] = key;
            }
        } else {
            newActive[id] = key;
        }
    }

    //  Прячем все блоки, которые были в старом active, но не попали в новый.
    for (var id in oldActive) {
        var key = oldActive[id];
        if (newActive[id] !== key) {
            var subviews = views[key]._getDescendants( [] );
            for (var i = 0, l = subviews.length; i < l; i++) {
                subviews[i]._hide();
            }
        }
    }

    //  Показываем все блоки, которые видны в новом active.
    for (var id in newActive) {
        var key = newActive[id];
        views[key]._show();
    }

    //  Запоминаем новый active.
    this.active = newActive;
};

