/**
    @constructor
    @param {no.View} view
    @param {string} layout_id
    @param {Object} params
*/
no.Update = function(view, layout_id, params) {
    this.id = no.Update.id++;

    this.view = view;
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

    var tree = this.tree = this.view.getLayoutTree(this);

    var params = this.params;

    var that = this;
    no.Update.walkLeafs(tree, function(view_id, type) {
        var models = no.View.getInfo( view_id ).models;
        for (var model_id in models) {
            var item = {
                model_id: model_id,
                params: params,
                key: no.Model.get( model_id ).getKey( params )
            };

            that.addItemToRequest('all', item);
            // FIXME: Добавить item в lazy/nonlazy.
        }
    });
};

/**
    @param {!Object} obj
    @param {function} callback
*/
no.Update.walkLeafs = function(obj, callback) {
    for (var key in obj) {
        var value = obj[key];
        if (typeof value !== 'object') {
            callback(key, value);
        } else {
            no.Update.walkLeafs(value, callback);
        }
    }
};


/**
    @param {boolean|string|undefined} type
    @param {{ model_id: string, params: Object, key: string }} item
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

    var viewsTree = [];
    this.view.getUpdateTrees(this, viewsTree);

    var tree = {
        views: viewsTree,
        update_id: this.id
    };

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
    this.view.processTree(function(view) {
        // console.log('update.walk', view.id, view.needUpdate(that));
        if (view.needUpdate(that)) {
            // console.log('updating...', view.id);
            view.update(node, that, true);
            return false;
        }
    });
};

// ----------------------------------------------------------------------------------------------------------------- //

