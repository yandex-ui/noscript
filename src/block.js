/**
    @constructor
    @param {string} id          Уникальный id класса. Важно! Это не id инстанса, у всех блоков этого класса один id.
    @param {string} path        path блока в дереве блоков (в общем-то это просто xpath, отложенный от корня дерева).
    @param {!Object} params     Параметры блока (участвуют при построении ключа).
*/
no.Block = function(id, path, params) {
    this.id = id;
    this.params = params;
    this.path = path;

    var info = this.info = no.Block.getInfo(id);

    /** @type { Object.<string, { type, block: no.Block }> } */
    var blocks = this.blocks = {};

    var layout = info.layout;
    for (var block_id in layout) {
        var type = layout[ block_id ];

        var block = (type === null) ? this.subBox( block_id ) : this.subBlock( block_id );
        blocks[ block_id ] = {
            type: type,
            block: block
        };
    }

    /** @type {Element} */
    this.node;

    /** @type {boolean|undefined} */
    this.status;
};

/**
    @typedef {function(
        new:no.Block,
        string,
        string,
        Object
    )}
*/
no.Block.Create;

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @typedef {{
        layout: Object,
        handlers: Object
    }}
*/
no.Block.Info;

// ----------------------------------------------------------------------------------------------------------------- //

/** @type { Object.<string, no.Block.Info> } */
no.Block._infos = {};

/** @type { Object.<string, no.Block.Create> } */
no.Block._classes = {};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} id
    @param {no.Block.Info=} info
    @param {no.Block.Create=} class_
*/
no.Block.register = function(id, info, class_) {
    info = info || {};

    var handlers = info.handlers = info.handlers || {};

    var keyParams = {};
    for (var handler_id in info.handlers) {
        no.extends( keyParams, no.Handler.getInfo( handler_id ).params );
    }

    var layout = info.layout = info.layout || {};

    for (var block_id in layout) {
        if (layout[ block_id ] !== null) { // Это не box.
            var blockParams = no.Block.getInfo( block_id )._keyParams;
            for (var i = 0, l = blockParams.length; i < l; i++) {
                keyParams[ blockParams[i] ] = true;
            }
        }
    }

    info._keyParams = no.keys(keyParams).sort();

    no.Block._infos[id] = info;
    no.Block._classes[id] = class_ || no.Block;
};

/**
    @param {string} id
    @return {no.Block.Info}
*/
no.Block.getInfo = function(id) {
    return no.Block._infos[id] || {};
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} block_id
    @param {string} path
    @param {Object} params
    @return {no.Block}
*/
no.Block.make = function( block_id, path, params ) {
    var class_ = no.Block._classes[ block_id ];

    return new class_( block_id, path, params );
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} block_id
    @return {string}
*/
no.Block.prototype.subPath = function( block_id ) {
    return this.path + '/' + block_id;
};

/**
    @param {string} block_id
    @return {no.Block}
*/
no.Block.prototype.subBlock = function( block_id ) {
    return no.Block.make( block_id, this.subPath( block_id ), this.params );
};

/**
    @param {string} box_id
    @return {no.Box}
*/
no.Block.prototype.subBox = function( box_id ) {
    return new no.Box( box_id, this.subPath( box_id ) );
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} block_id
    @param {Object} params
    @return {string}
*/
no.Block.getKey = function(block_id, params) {
    var info = no.Block.getInfo(block_id);

    var key = 'block=' + block_id;

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
no.Block.prototype.isCached = function() {
    return this.status;
};

/**
    @return {boolean}
*/
no.Block.prototype.needUpdate = function(update) {
    return !this.status;
};

// ----------------------------------------------------------------------------------------------------------------- //

no.Block.prototype.hide = function() {
    this.node.style.display = 'none';
};

no.Block.prototype.show = function() {
    this.node.style.display = '';
};

// ----------------------------------------------------------------------------------------------------------------- //

no.Block.prototype.onhtmlinit = no.pe;

no.Block.prototype.onhtmldestroy = no.pe;

no.Block.prototype.onshow = no.pe;

no.Block.prototype.onhide = no.pe;

no.Block.prototype.onrepaint = no.pe;

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {no.Update} update
    @return {Object}
*/
no.Block.prototype.getLayoutTree = function(update) {
    var layout = update.layout;

    function blockTree(id, path, tree) {
        var blockLayout = no.Block.getInfo(id).layout;

        if (no.object.empty( blockLayout )) { // Обычный блок, без подблоков или боксов.
            tree[id] = true;
        } else {
            tree = tree[id] = {};

            for (var block_id in blockLayout) {
                var type = blockLayout[ block_id ];

                if (type === null) { // box.
                    boxTree( block_id, path, tree );
                } else { // block.
                    tree[ block_id ] = type;
                }
            }
        }
    }

    function boxTree(id, path, tree) {
        tree = tree[ id ] = {};

        var boxPath = path + '/' + id;

        var blocks = layout[ boxPath ];
        for (var i = 0, l = blocks.length; i < l; i++) {
            var block_id = blocks[i];
            var blockPath = boxPath + '/' + block_id;

            blockTree( block_id, blockPath, tree );
        }
    }

    var tree = {};
    blockTree( this.id, this.path, tree );

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
no.Block.prototype.getUpdateTrees = function(update, trees) {
    if (this.needUpdate(update)) {
        trees.push( this.getLayoutTree(update) );
    } else {
        this.processChildren( function(block) {
            block.getUpdateTrees(update, trees);
        } );
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {Element} node
    @param {no.Update} update
    @param {boolean} replace
*/
no.Block.prototype.update = function(node, update, replace) {
    node = no.byClass( 'block-' + this.id, node )[0];
    if (!node) { return; }

    var blocks = this.blocks;
    for (var block_id in blocks) {
        blocks[ block_id ].block.update(node, update, false);
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

    @param {function((no.Block|no.Box)): (boolean|undefined)} callback
*/
no.Block.prototype.processTree = function(callback) {
    var r = callback(this);
    if (r === false) { return; }

    var blocks = this.blocks;
    for (var block_id in blocks) {
        var block = blocks[ block_id ].block;
        block.processTree(callback);
    }
};

/**
    Применяем переданный callback ко всем "детям" блока.
    Т.е. к непосредственным потомкам этого блока.

    @param {function(no.Block|no.Box)} callback
*/
no.Block.prototype.processChildren = function(callback) {
    var blocks = this.blocks;
    for (var block_id in blocks) {
        var block = blocks[ block_id ].block;
        callback(block);
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
no.Block.ids2keys = function(ids, params) {
    var keys = [];
    for (var i = 0, l = ids.length; i < l; i++) {
        keys.push( no.Block.getKey( ids[i], params ) );
    }
    return keys;
};

// ----------------------------------------------------------------------------------------------------------------- //

