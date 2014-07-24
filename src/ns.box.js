/**
 * Это внутренний класс, который не должен использоваться приложением.
 * @classdesc Box - это тип View, который умеет выбирать какие View показывать.
 * @param {string} id
 * @param {object} params
 * @constructor
 * @private
 */
ns.Box = function(id, params) {
    this.id = id;
    this.params = params;

    this.views = {};

    // у бокса нет декларации и ключ строить не надо
    this.key = ns.Box.getKey(id);

    this.node = null;
    this.active = {};

    this._visible = false;
};

ns.Box.prototype._getCommonTree = ns.View.prototype._getCommonTree;

/**
 * Возвращает ключ вида
 * @param {string} id Название вида
 * @param {object} params Параметры для ключа
 * @param {ns.L.TYPE} type Тип
 * @returns {string}
 * @private
 */
ns.Box.prototype._getViewKey = function(id, params, type) {
    var key;
    if (type === ns.L.BOX) {
        key = ns.Box.getKey(id);
    } else {
        key = ns.View.getKey(id, params);
    }

    return key;
};

/**
 *
 * @param {string} id
 * @param {object} params
 * @param {string} type Тип вида.
 * @returns {ns.View}
 * @private
 */
ns.Box.prototype._getView = function(id, params, type) {
    var key = this._getViewKey(id, params, type);
    return this.views[key];
};

/**
 *
 * @param {string} id
 * @param {object} params
 * @param {ns.L} type
 * @returns {ns.View}
 * @private
 */
ns.Box.prototype._addView = function(id, params, type) {
    var view = this._getView(id, params, type);
    if (!view) {
        if (type === ns.L.BOX) {
            view = new ns.Box(id, params);
        } else {
            view = ns.View.create(id, params, type === ns.L.ASYNC);
        }
        this.views[view.key] = view;
    }
    return view;
};

/**
 *
 * @param {array} descs
 * @returns {array}
 * @private
 */
ns.Box.prototype._getDescendants = function(descs) {
    var views = this.views;
    var active = this.active;

    descs.push(this);

    for (var id in active) {
        var view = views[ active[id] ];
        descs.push(view);
        view._getDescendants(descs);
    }

    return descs;
};

/**
 * Ищем все новые блоки и блоки, требующие перерисовки.
 * @param {object} updated
 * @param {object} layout
 * @param {object} params
 * @private
 */
ns.Box.prototype._getRequestViews = function(updated, layout, params) {
    for (var id in layout) {
        //  Согласно новому layout'у здесь должен быть view с id/params.
        //  Создаем его (если он уже есть, он возьмется из this.views).
        var view = this._addView(id, params, layout[id].type);
        //  Идем вниз рекурсивно.
        view._getRequestViews(updated, layout[id].views, params);
    }
};

/**
 * Боксы всегда валидные, т.е. не toplevel, поэтому просто идем вниз по дереву.
 * @param {object} tree
 * @param {object} layout
 * @param {object} params
 * @private
 */
ns.Box.prototype._getUpdateTree = function(tree, layout, params) {
    if ( this.isNone() ) {
        tree.views[this.id] = this._getViewTree(layout, params);

    } else {
        var views = this.views;
        for (var id in layout) {
            var selfLayout = layout[id];
            var key = this._getViewKey(id, params, selfLayout.type);
            views[key]._getUpdateTree(tree, selfLayout.views, params);
        }
    }
};

/**
 * Строим дерево блоков.
 * @param {object} layout
 * @param {object} params
 * @returns {object}
 * @private
 */
ns.Box.prototype._getViewTree = function(layout, params) {
    var tree = this._getCommonTree();
    tree.box = true;

    var views = this.views;
    for (var id in layout) {
        var selfLayout = layout[id];
        var key = this._getViewKey(id, params, selfLayout.type);
        tree.views[id] = views[key]._getViewTree(selfLayout.views, params);
    }

    return tree;
};

/**
 * Обновляем бокс.
 * @param {HTMLElement} node
 * @param {object} layout
 * @param {object} params
 * @param {object} options
 * @param {object} events
 * @private
 */
ns.Box.prototype._updateHTML = function(node, layout, params, options, events) {
    var oldNode;
    // Если
    //  - старой ноды не было
    //  - или этот box не toplevel (т.е. родительский view обновил свою ноду)
    if (!this.node || !options.toplevel) {
        // Ищем новую ноду бокса.
        var newNode = ns.byClass('ns-view-' + this.id, node)[0];
        // И если есть
        if (newNode) {
            // Сохраним ссылку на старую ноду
            oldNode = this.node;
            // Обновим ноду бокса
            this.node = newNode;
        }
    }

    if (!this.node) {
        throw new Error("[ns.Box] Can't find node for '" + this.id + "'");
    }

    var views = this.views;

    //  this.active -- это объект (упорядоченный!), в котором лежат ключи
    //  активных (видимых) в данный момент блоков.
    var layoutActive = {};

    //  Строим новый active согласно layout'у.
    //  Т.е. это тот набор блоков, которые должны быть видимы в боксе после окончания всего апдейта
    //  (включая синхронную и все асинхронные подапдейты).
    for (var id in layout) {
        var selfLayout = layout[id];
        var key = this._getViewKey(id, params, selfLayout.type);
        layoutActive[id] = key;

        //  Достаем ранее созданный блок (в _getRequestViews).
        /** @type {ns.View} */
        var view = views[key];

        var viewWasNone = view.isNone();

        //  Обновляем его.
        view._updateHTML(node, selfLayout.views, params, options, events);

        // вставляем view в DOM, только если ноды раньше не было (view.status === NONE)
        // если нода была, то view._updateHTML() сделаем сам все свои обновления
        // NOTE: с такой логикой порядок view никак не гарантируется! Возможно это проблема...
        if (viewWasNone && ( view.isOk() || view.isLoading() ) ) {
            this.node.appendChild(view.node);
        }
    }

    //  Строим новый active, но уже не по layout'у, а по актуальным блокам.
    var newActive = {};
    for (var activeId in layoutActive) {
        var activeKey = layoutActive[activeId];
        newActive[activeId] = activeKey;
    }

    // Пройдёмся по всем вложенным видам, чтобы
    //  1. Спрятать виды, которые не попали в layout
    //  2. Перенести ноды вложенных видов в новую ноду бокса (если есть)
    for (var key in this.views) {
        var view = this.views[key];
        // Если вид не входит в новый active
        if (newActive[view.id] !== view.key) {
            // Скроем виды, не попавшие в layout
            var descs = view._getDescendants( [] );
            for (var i = 0, l = descs.length; i < l; i++) {
                // если view был скрыт
                if (descs[i]._hide()) {
                    events['ns-view-hide'].push(descs[i]);
                }
            }
            // Если нода вида лежит в старой ноде бокса
            if (oldNode && oldNode.contains(view.node)) {
                // Перенесём её в новую ноду бокса
                this.node.appendChild(view.node);
            }
        }
    }

    //  Запоминаем новый active.
    this.active = newActive;

    this._show();
};

/**
 *
 * @returns {boolean}
 * @private
 */
ns.Box.prototype._show = function() {
    if (this._visible === false) {
        this._showNode();
        this._visible = true;
        // always returns false to prevent events trigger
    }

    return false;
};

/**
 * Скрывает view
 * @returns {Boolean}
 * @protected
 */
ns.Box.prototype._hide = function() {
    if (this._visible === true) {
        this._hideNode();
        this._visible = false;
        // always returns false to prevent events trigger
    }

    return false;
};

/**
 * @private
 */
ns.Box.prototype._hideNode = function() {
    this.node.className = this.node.className.replace(' ns-view-visible', '') + ' ns-view-hidden';
};

/**
 *
 * @private
 */
ns.Box.prototype._showNode = function() {
    this.node.className = this.node.className.replace(' ns-view-hidden', '') + ' ns-view-visible';
};

ns.Box.prototype.isOk = no.true;
ns.Box.prototype.isLoading = no.false;

/**
 * Returns true if box has status NONE
 * @returns {boolean}
 */
ns.Box.prototype.isNone = function() {
    return !this.node;
};

/**
 * Создает ключ для ns.Box.
 * @param {string} id Название ns.Box.
 * @returns {string}
 * @static
 */
ns.Box.getKey = function(id) {
    return 'box=' + id;
};
