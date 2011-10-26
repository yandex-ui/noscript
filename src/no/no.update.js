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
        for (var i = 0, l = models.length; i < l; i++) {
            var model_id = models[i];
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
    var all = this.requests['all'];
    var items = no.object.values(all);

    var that = this;
    no.request(items).promise()
        .then(function() {
            var viewsTree = [];
            that.view.getUpdateTrees(that, viewsTree);

            var tree = {
                views: viewsTree,
                models: {}
            };
            var models = tree.models;
            for (var i = 0, l = items.length; i < l; i++) {
                var item = items[i];
                var model_id = item.model_id;

                models[model_id] = no.Model.get(model_id).getCache( item.key );
            }

            // console.time('template');
            var html = stylesheet( tree ); // FIXME: Нужно проверять, что update не нужен и ничего не делать.
            // console.timeEnd('template');
            var div = document.createElement('div');
            div.innerHTML = html;

            var node = div.firstChild;

            that.update(node);
        });

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
        if (view.needUpdate(that)) {
            view.update(node, that, true);
            return false;
        }
    });
};

// ----------------------------------------------------------------------------------------------------------------- //

