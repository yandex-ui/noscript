/**
    @constructor
    @param {string} id
    @param {string} path
*/
no.Box = function(id, path) {
    this.id = id;
    this.path = path;

    /** @type { Object.<string, no.Block> } */
    this.archive = {};

    /** @type {Element} */
    this.node;

    /** @type {boolean|undefined} */
    this.status;

    /** @type {Array.<string>} */
    this.current;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} block_id
    @return {string}
*/
no.Box.prototype.subPath = function( block_id ) {
    return this.path + '/' + block_id;
};

/**
    @param {string} block_id
    @param {Object} params
    @return {no.Block}
*/
no.Box.prototype.subBlock = function( block_id, params ) {
    return no.Block.make( block_id, this.subPath( block_id ), params );
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {Element} node
    @param {no.Update} update
*/
no.Box.prototype.update = function(node, update) {
    if (!this.status) {
        var node = no.byClass('box-' + this.id, node)[0];
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

    var current = [];
    var children = node.children; // FIXME: node.children не работает в FF3.0.

    for (var i = 0, l = children.length; i < l; i++) {
        var child = children[i];
        var className = child.className;
        var r = className.match(/\bblock-(\S+)\b/);
        if (r) {
            var block_id = r[1];

            var key = no.Block.getKey(block_id, params);
            current.push(key);

            var block = archive[key] = this.subBlock(block_id, params);
            block.update(node, update, false); // FIXME: Плохо, что child уже найден, а передаем мы node.
        }
    }

    if (!this.current) {
        this.current = current;
    }

    this.updateCurrent(node, update);

};

/**
    @param {Element} node
    @param {no.Update} update
*/
no.Box.prototype.updateCurrent = function(node, update) {
    var params = update.params;

    var archive = this.archive;

    var blocks = update.layout[ this.path ];
    var content = no.Block.ids2keys(blocks, params);
    var contentKeys = no.array.toObject(content);

    var current = no.array.grep(this.current, function(key) {
        if (!(key in contentKeys)) {
            archive[key].hide();
            return false;
        }
        return true;
    });

    var node = this.node;
    for (var i = 0, l = blocks.length; i < l; i++) {
        var block_id = blocks[i];
        var key = content[i];

        var block = archive[key];
        if (!block) {
            block = archive[key] = this.subBlock(block_id, params);
            block.update(node, update);
        }
        block.show();

        node.appendChild(block.node);
    }

    this.current = content;
};


// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {function(no.Block): (boolean|undefined)}
*/
no.Box.prototype.processTree = function(callback) {
    var r = callback(this);
    if (r === false) { return; }

    var current = this.current;
    if (current) {
        var archive = this.archive;
        for (var i = 0, l = current.length; i < l; i++) {
            var block = archive[ current[i] ];
            block.processTree(callback);
        }
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {no.Update} update
    @return {boolean}
*/
no.Box.prototype.needUpdate = function(update) {
    var current = this.current;
    if (!current) { return true; }

    var content = no.Block.ids2keys( update.layout[ this.path ], update.params );

    return ( content.join('|') !== current.join('|') );
};


/**
    @param {no.Update} update
    @param {Object} trees
*/
no.Box.prototype.getUpdateTrees = function(update, trees) {
    var archive = this.archive;
    var params = update.params;

    var content_ids = update.layout[ this.path ];
    var content_keys = no.Block.ids2keys( content_ids, params );

    for (var i = 0, l = content_keys.length; i < l; i++) {
        var key = content_keys[i];
        var block = archive[key];
        if (!archive[key]) {
            block = this.subBlock( content_ids[i], params );
        }
        block.getUpdateTrees(update, trees);
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

