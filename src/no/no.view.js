/**
    @constructor
    @param {string} id          Уникальный id класса. Важно! Это не id инстанса, у всех блоков этого класса один id.
    @param {!Object} params     Параметры блока (участвуют при построении ключа).
    @param {no.View=} parent    Родительский view.
*/
no.View = function(id, params, parent) {
    this.id = id;
    this.params = params;
    this.parent = parent || null;

    var info = this.info = no.View.info(id);

    /** @type { Object.<string, { type, view: no.View }> } */
    var views = this.views = {};

    var layout = info.layout;
    for (var view_id in layout) {
        var type = layout[ view_id ];

        var view = (type === null) ? this.subBox( view_id, params ) : this.subView( view_id, params );
        views[ view_id ] = view;
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
        !Object
    )}
*/
no.View.type_class;

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @typedef {{
        layout: Object,
        models: Object
    }}
*/
no.View.type_info;

// ----------------------------------------------------------------------------------------------------------------- //

/** @type { Object.<string, no.View.type_info> } */
no.View._infos = {};

/** @type { Object.<string, no.View.type_class> } */
no.View._classes = {};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} id
    @param {no.View.type_info=} info
    @param {no.View.type_class=} class_
*/
no.View.register = function(id, info, class_) {
    info = info || {};
    class_ = class_ || no.View;

    var models = info.models = info.models || [];

    var keyParams = {};
    for (var i = 0, l = info.models.length; i < l; i++) {
        var model_id = info.models[i];
        no.extend( keyParams, no.Model.info( model_id ).keyParams );
    }

    var layout = info.layout = info.layout || {};

    for (var view_id in layout) {
        if (layout[ view_id ] !== null) { // Это не box.
            var viewParams = no.View.info( view_id )._keyParams;
            for (var i = 0, l = viewParams.length; i < l; i++) {
                keyParams[ viewParams[i] ] = true;
            }
        }
    }

    info._keyParams = no.object.keys(keyParams).sort();

    no.View._infos[id] = info;
    no.View._classes[id] = class_;
};

/**
    @param {string} id
    @return {no.View.type_info}
*/
no.View.info = function(id) {
    return no.View._infos[id];
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} view_id
    @param {!Object} params
    @return {no.View}
*/
no.View.make = function(view_id, params, parent) {
    var class_ = no.View._classes[ view_id ];

    return new class_( view_id, params, parent );
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} view_id
    @return {no.View}
*/
no.View.prototype.subView = function(view_id) {
    return no.View.make( view_id, this.params, this );
};

/**
    @param {string} box_id
    @param {!Object} params
    @return {no.Box}
*/
no.View.prototype.subBox = function(box_id, params) {
    return new no.Box( box_id, params, this );
};

// ----------------------------------------------------------------------------------------------------------------- //

no.View.prototype.getKey = function() {
    return no.View.getKey( this.id, this.params, this.info );
};

/**
    @param {string} view_id
    @param {Object} params
    @return {string}
*/
no.View.getKey = function(view_id, params, info) {
    info || ( info = no.View.info(view_id) );

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
    @param {string} id
    @param {no.Update} update
    @return {Object}
*/
no.View.getLayoutTree = function(id, update) {

    var pLayout = update.layout; // page layout.

    var tree = {};
    tree[id] = viewTree(id);

    return tree;

    function viewTree(id) {
        var vLayout = no.View.info(id).layout; // view layout.

        if (no.object.isEmpty( vLayout )) { // Обычный блок, без подблоков или боксов.
            return true;
        } else {
            var tree = {};

            for (var view_id in vLayout) {
                var type = vLayout[ view_id ];
                tree[ view_id ] = (type === null) ? boxTree( view_id, id ) : viewTree( view_id );
            }

            return tree;
        }
    }

    function boxTree(id, parent_id) {
        var tree = {};

        var views = pLayout[ parent_id ][ id ];
        for (var i = 0, l = views.length; i < l; i++) {
            var view_id = views[i];
            tree[ view_id ] = viewTree( view_id );
        }

        return tree;
    }

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
    if ( this.needUpdate(update) ) {
        trees.push( no.View.getLayoutTree( this.id, update ) );
    } else {
        this.processChildren(function(view) {
            view.getUpdateTrees(update, trees);
        });
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {Element} node
    @param {no.Update} update
    @param {boolean} replace
*/
no.View.prototype.update = function(node, update, replace) {
    if (!this.node) {
        this.node = no.byClass( 'view-' + this.id, node )[0];
        if (!this.node) { return; }
    }

    this.processChildren(function(view) {
        view.update(node, update, false);
    });

    if (replace) {
        no.replaceNode(this.node, node);
    }

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

    this.processChildren(function(view) {
        view.processTree(callback);
    });
};

/**
    Применяем переданный callback ко всем "детям" блока.
    Т.е. к непосредственным потомкам этого блока.

    @param {function((no.View|no.Box))} callback
*/
no.View.prototype.processChildren = function(callback) {
    var views = this.views;
    for (var view_id in views) {
        callback( views[ view_id ] );
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

no.view2model = {};

no.view2model._cache = {};

no.view2model.addModel = function(id, key) {

};

no.view2model.removeModel = function(id, key) {

};

no.view2model.addView = function(id, key) {

};

no.view2model.removeView = function(id, key) {

};

// ----------------------------------------------------------------------------------------------------------------- //

