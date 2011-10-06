/**
    @constructor
    @param {string} id          Уникальный id класса. Важно! Это не id инстанса, у всех блоков этого класса один id.
    @param {string} path        path блока в дереве блоков (в общем-то это просто xpath, отложенный от корня дерева).
    @param {!Object} params     Параметры блока (участвуют при построении ключа).
*/
no.View = function(id, path, params) {
    this.id = id;
    this.params = params;
    this.path = path;

    var info = this.info = no.View.getInfo(id);

    /** @type { Object.<string, { type, view: no.View }> } */
    var views = this.views = {};

    var layout = info.layout;
    for (var view_id in layout) {
        var type = layout[ view_id ];

        var view = (type === null) ? this.subBox( view_id ) : this.subView( view_id );
        views[ view_id ] = {
            type: type,
            view: view
        };
    }

    /** @type {Element} */
    this.node;

    /** @type {boolean|undefined} */
    this.status;
};

/**
    @typedef {function(
        new:no.View,
        string,
        string,
        Object
    )}
*/
no.View.Create;

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @typedef {{
        layout: Object,
        handlers: Object
    }}
*/
no.View.Info;

// ----------------------------------------------------------------------------------------------------------------- //

/** @type { Object.<string, no.View.Info> } */
no.View._infos = {};

/** @type { Object.<string, no.View.Create> } */
no.View._classes = {};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} id
    @param {no.View.Info=} info
    @param {no.View.Create=} class_
*/
no.View.register = function(id, info, class_) {
    info = info || {};

    var handlers = info.handlers = info.handlers || {};

    var keyParams = {};
    for (var handler_id in info.handlers) {
        no.extends( keyParams, no.Handler.getInfo( handler_id ).params );
    }

    var layout = info.layout = info.layout || {};

    for (var view_id in layout) {
        if (layout[ view_id ] !== null) { // Это не box.
            var viewParams = no.View.getInfo( view_id )._keyParams;
            for (var i = 0, l = viewParams.length; i < l; i++) {
                keyParams[ viewParams[i] ] = true;
            }
        }
    }

    info._keyParams = no.object.keys(keyParams).sort();

    no.View._infos[id] = info;
    no.View._classes[id] = class_ || no.View;
};

/**
    @param {string} id
    @return {no.View.Info}
*/
no.View.getInfo = function(id) {
    return no.View._infos[id] || {};
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} view_id
    @param {string} path
    @param {Object} params
    @return {no.View}
*/
no.View.make = function( view_id, path, params ) {
    var class_ = no.View._classes[ view_id ];

    return new class_( view_id, path, params );
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} view_id
    @return {string}
*/
no.View.prototype.subPath = function( view_id ) {
    return this.path + '/' + view_id;
};

/**
    @param {string} view_id
    @return {no.View}
*/
no.View.prototype.subView = function( view_id ) {
    return no.View.make( view_id, this.subPath( view_id ), this.params );
};

/**
    @param {string} box_id
    @return {no.Box}
*/
no.View.prototype.subBox = function( box_id ) {
    return new no.Box( box_id, this.subPath( box_id ) );
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} view_id
    @param {Object} params
    @return {string}
*/
no.View.getKey = function(view_id, params) {
    var info = no.View.getInfo(view_id);

    var key = 'view=' + view_id;

    var keyParams = info._keyParams || [];
    for (var i = 0, l = keyParams.length; i < l; i++) {
        var pName = keyParams[i];
        var pValue = params[pName];
        if (pValue) {
            key += '&' + pName + '=' + pValue;
        }
    }

    return key;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @return {boolean}
*/
no.View.prototype.isCached = function() {
    return this.status;
};

/**
    @return {boolean}
*/
no.View.prototype.needUpdate = function(update) {
    return !this.status;
};

// ----------------------------------------------------------------------------------------------------------------- //

no.View.prototype.hide = function() {
    this.node.style.display = 'none';
};

no.View.prototype.show = function() {
    this.node.style.display = '';
};

// ----------------------------------------------------------------------------------------------------------------- //

no.View.prototype.onhtmlinit = no.pe;

no.View.prototype.onhtmldestroy = no.pe;

no.View.prototype.onshow = no.pe;

no.View.prototype.onhide = no.pe;

no.View.prototype.onrepaint = no.pe;

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {no.Update} update
    @return {Object}
*/
no.View.prototype.getLayoutTree = function(update) {
    var layout = update.layout;

    function viewTree(id, path, tree) {
        var viewLayout = no.View.getInfo(id).layout;

        if (no.object.empty( viewLayout )) { // Обычный блок, без подблоков или боксов.
            tree[id] = true;
        } else {
            tree = tree[id] = {};

            for (var view_id in viewLayout) {
                var type = viewLayout[ view_id ];

                if (type === null) { // box.
                    boxTree( view_id, path, tree );
                } else { // view.
                    tree[ view_id ] = type;
                }
            }
        }
    }

    function boxTree(id, path, tree) {
        tree = tree[ id ] = {};

        var boxPath = path + '/' + id;

        var views = layout[ boxPath ];
        for (var i = 0, l = views.length; i < l; i++) {
            var view_id = views[i];
            var viewPath = boxPath + '/' + view_id;

            viewTree( view_id, viewPath, tree );
        }
    }

    var tree = {};
    viewTree( this.id, this.path, tree );

    return tree;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    Рекурсивно проходим по дереву блоков и ищем блоки, нуждающиеся в обновлении.
    Для каждого такого блока строим его layout tree и сохраняем в массиве trees.
    При этом под-дерево уже не обрабатываем (потому что оно все уже содержится в layout tree).

    В последствие, массив trees используется как "каркас" для наложения шаблона.
    Он показывает, какие блоки нужно сгенерить и какова структура этих блоков.

    @param {no.Update} update
    @param {Array} trees
*/
no.View.prototype.getUpdateTrees = function(update, trees) {
    if (this.needUpdate(update)) {
        trees.push( this.getLayoutTree(update) );
    } else {
        this.processChildren( function(view) {
            view.getUpdateTrees(update, trees);
        } );
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {Element} node
    @param {no.Update} update
    @param {boolean} replace
*/
no.View.prototype.update = function(node, update, replace) {
    node = no.byClass( 'view-' + this.id, node )[0];
    if (!node) { return; }

    var views = this.views;
    for (var view_id in views) {
        views[ view_id ].view.update(node, update, false);
    }

    if (replace) {
        no.replaceNode(this.node, node);
    }

    this.node = node;
    this.status = true;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    Рекурсивно обходим все дерево блока и применяем к каждому потомку (блоку или боксу) переданный callback.

    При этом сперва вызываем callback, а потом уже обрабатываем под-дерево.
    Если же callback возвращает false, то подблоки не обрабатываем.

    @param {function((no.View|no.Box)): (boolean|undefined)} callback
*/
no.View.prototype.processTree = function(callback) {
    var r = callback(this);
    if (r === false) { return; }

    var views = this.views;
    for (var view_id in views) {
        var view = views[ view_id ].view;
        view.processTree(callback);
    }
};

/**
    Применяем переданный callback ко всем "детям" блока.
    Т.е. к непосредственным потомкам этого блока.

    @param {function(no.View|no.Box)} callback
*/
no.View.prototype.processChildren = function(callback) {
    var views = this.views;
    for (var view_id in views) {
        var view = views[ view_id ].view;
        callback(view);
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    Превращаем массив id-шников блоков в массив ключей блоков,
    соответствующих переданным параметрам.

    @param {Array.<string>} ids
    @param {Object} params
    @return {Array.<string>}
*/
no.View.ids2keys = function(ids, params) {
    var keys = [];
    for (var i = 0, l = ids.length; i < l; i++) {
        keys.push( no.View.getKey( ids[i], params ) );
    }
    return keys;
};

// ----------------------------------------------------------------------------------------------------------------- //

