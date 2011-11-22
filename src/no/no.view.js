/**
    @constructor
    @param {string} id          Уникальный id класса. Важно! Это не id инстанса, у всех блоков этого класса один id.
    @param {!Object} params     Параметры блока (участвуют при построении ключа).
*/
no.View = function(id, params) {
    this.id = id;
    this.params = params;

    var info = this.info = no.View.getInfo(id);

    /** @type { Object.<string, { type, view: no.View }> } */
    var views = this.views = {};

    var layout = info.layout;
    for (var view_id in layout) {
        var type = layout[ view_id ];

        var view = (type === null) ? this.subBox( view_id ) : this.subView( view_id );
        views[ view_id ] = view;
        /*
        // FIXME
        {
            type: type,
            view: view
        };
        */
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
no.View.Create;

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @typedef {{
        layout: Object,
        models: Object
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

    var models = info.models = info.models || [];

    var keyParams = {};
    for (var i = 0, l = info.models.length; i < l; i++) {
        var model_id = info.models[i];
        no.extend( keyParams, no.Model.getInfo( model_id ).params );
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
    @param {Object} params
    @return {no.View}
*/
no.View.make = function( view_id, params ) {
    var class_ = no.View._classes[ view_id ];

    return new class_( view_id, params );
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} view_id
    @return {no.View}
*/
no.View.prototype.subView = function( view_id ) {
    return no.View.make( view_id, this.params );
};

/**
    @param {string} box_id
    @return {no.Box}
*/
no.View.prototype.subBox = function( box_id ) {
    return new no.Box( box_id, this.params );
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
    @param {string} id
    @param {no.Update} update
    @return {Object}
*/
no.View.getLayoutTree = function(id, update) {

    var pLayout = update.layout; // page layout.
    var vLayout = no.View.getInfo(id).layout; // view layout.

    var tree = {};

    if (no.object.isEmpty( vLayout )) { // Обычный блок, без подблоков или боксов.
        tree[id] = true;
    } else {
        var subtree = tree[id] = {};

        for (var view_id in vLayout) {
            var type = vLayout[ view_id ];
            subtree[ view_id ] = (type === null) ? boxTree( view_id, id ) : no.View.getLayoutTree( view_id, update );
        }
    }

    return tree;

    function boxTree(box_id, view_id) {
        var tree = {};

        var views = pLayout[ view_id ][ box_id ];
        for (var i = 0, l = views.length; i < l; i++) {
            var id = views[i];
            tree[id] = no.View.getLayoutTree(id, update);
        }
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
        trees.push( no.view.getLayoutTree( this.id, update ) );
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

