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
    this.groups = {};

    var tree = this.tree = no.View.getLayoutTree( this.view.id, this );

    var params = this.params;

    var that = this;
    no.Update.walkLeafs(tree, function(view_id, type) {
        var models = no.View.info( view_id ).models;
        for (var i = 0, l = models.length; i < l; i++) {
            var model_id = models[i];
            that.addItemToGroup('all', model_id, params);
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
    @param {string} group_name Group name.
    @param {string} model_id Model identifier.
    @param {Object} params Model get params.
*/
no.Update.prototype.addItemToGroup = function(group_name, model_id, params) {
    var group = this.groups[group_name];
    if (!group) {
        group = ((this.groups[group_name] = { models: [], params: {} } ));
    }

    group.models.push = model_id;
    no.extend(group.params, params); // Расширяем параметры для запроса моделей.
};

// ----------------------------------------------------------------------------------------------------------------- //

no.Update.prototype.request = function() {
    var groups = no.object.values(this.groups);

    var that = this;
    var req = new no.Request(groups);
    req
        .start()
        .then(function() {
            var viewsTree = [];
            that.view.getUpdateTrees(that, viewsTree);

            var tree = {
                views: viewsTree,
                models: {}
            };
            var models = tree.models;
            for (var i = 0, l = groups.length; i < l; i++) {
                var group = groups[i];
                for (var j = 0, m = group.models.length; j < m; j++) {
                    var model_id = group.models[j];
                    models[model_id] = no.Model.get(model_id).getCache( no.Model.key(model_id, group.params) );
                }
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

