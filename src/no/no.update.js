/**
    @constructor
    @param {no.Block} block
    @param {string} layout_id
    @param {Object} params
*/
no.Update = function(block, layout_id, params) {
    this.id = no.Update.id++;

    this.block = block;
    this.layout_id = layout_id;
    this.params = params;

    this.layout = no.layout.get( layout_id );

    this.prepare();
    this.request();
};

/** @type {number} */
no.Update.id = 0;

// ----------------------------------------------------------------------------------------------------------------- //

no.Update.prototype.prepare = function() {
    this.requests = {};

    var tree = this.tree = this.block.getLayoutTree(this);

    var params = this.params;

    var that = this;
    no.object.walkLeafs(tree, function(block_id, type) {
        var handlers = no.Block.getInfo( block_id ).handlers;
        for (var handler_id in handlers) {
            var item = {
                handler_id: handler_id,
                params: params,
                key: no.Handler.get( handler_id ).getKey( params )
            };

            that.addItemToRequest('all', item);
            // FIXME: Добавить item в lazy/nonlazy.
        }
    });
};

/**
    @param {boolean|string|undefined} type
    @param {{ handler_id: string, params: Object, key: string }} item
*/
no.Update.prototype.addItemToRequest = function(type, item) {
    var items = this.requests[type];
    if (!items) {
        items = this.requests[type] = {};
    }

    items[ item.key ] = item;
};

// ----------------------------------------------------------------------------------------------------------------- //

no.Update.prototype.request = function() {
    var all = no.object.keys( this.requests['all'] );
    // FIXME: Отправить запрос и подписаться на ответ.
    // FIXME: Построить дерево для наложения шаблонов.
    // FIXME: Наложить шаблон и получить результат в виде html-ноды.

    var blocksTree = [];
    this.block.getUpdateTrees(this, blocksTree);

    var tree = {
        blocks: blocksTree,
        update_id: this.id
    };
    // console.log('tree', tree);

    var html = stylesheet( tree );
    var div = document.createElement('div');
    div.innerHTML = html;

    var node = div.firstChild;
    // console.log('result.node', node);

    this.update(node);
};

/**
    @param {Element} node
*/
no.Update.prototype.update = function(node) {
    /*
    if (this.canceled || this.id < no.Update.id) { // Запущен какой-то новый update, этот выполнять уже ненужно.
        return;
    }
    */

    /*
    if (!this.hasAllData()) {
        // ERROR.
        return;
    }
    */


    var that = this;
    this.block.processTree(function(block) {
        // console.log('update.walk', block.id, block.needUpdate(that));
        if (block.needUpdate(that)) {
            // console.log('updating...', block.id);
            block.update(node, that, true);
            return false;
        }
    });
};

// ----------------------------------------------------------------------------------------------------------------- //

