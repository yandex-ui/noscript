/**
    @constructor
    @param {string} id
    @param {!Object} params
    @param {no.View} parent
*/
no.Box = function(id, params, parent) {
    this.id = id;
    this.params = params;
    this.parent = parent;

    /** @type { Object.<string, no.View> } */
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
    @param {string} view_id
    @return {no.View}
*/
no.Box.prototype.subView = function(view_id, params) {
    return no.View.create( view_id, params, this );
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {Element} node
    @param {no.Update} update
*/
no.Box.prototype.update = function(node, update) {
    if (!this.status) {
        node = no.byClass('box-' + this.id, node)[0];
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

    if (!this.current) {
        var current = [];
        var children = node.children; // FIXME: node.children не работает в FF3.0.

        for (var i = 0, l = children.length; i < l; i++) {
            var child = children[i];
            var className = child.className;
            var r = className.match(/\bview-(\S+)\b/);
            if (r) {
                var view_id = r[1];

                var key = no.View.getKey(view_id, params);
                current.push(key);

                var view = archive[key] = this.subView(view_id, params);
                view.update(this.node, update, false); // FIXME: Плохо, что child уже найден, а передаем мы node.
            }
        }

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

    var views = update.layout[ this.parent.id ][ this.id ];
    var content = no.View.ids2keys(views, params);
    var contentKeys = no.array.toObject(content);

    var current = no.array.grep(this.current, function(key) { // Проходим по текущему контенту и прячем все блоки, которые не должны отображаться в текущем layout.
        if (!(key in contentKeys)) {
            archive[key].hide();
            return false;
        }
        return true;
    });

    for (var i = 0, l = views.length; i < l; i++) {
        var view_id = views[i];
        var key = content[i];

        var view = archive[key];
        if (!view) {
            view = archive[key] = this.subView(view_id, params);
        }
        if (view.needUpdate()) {
            view.update(node, update);
        }
        view.show();

        this.node.appendChild(view.node);
    }

    this.current = content;
};


// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {function(no.View): (boolean|undefined)}
*/
no.Box.prototype.processTree = function(callback) {
    var r = callback(this);
    if (r === false) { return; }

    var current = this.current;
    if (current) {
        var archive = this.archive;
        for (var i = 0, l = current.length; i < l; i++) {
            var view = archive[ current[i] ];
            view.processTree(callback);
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

    var views = update.layout[ this.parent.id ][ this.id ];
    var content = no.View.ids2keys(views, update.params);

    return ( content.join('|') !== current.join('|') );
};


/**
    @param {no.Update} update
    @param {Object} trees
*/
no.Box.prototype.getUpdateTrees = function(update, trees) {
    var archive = this.archive;
    var params = update.params;

    var views = update.layout[ this.parent.id ][ this.id ];
    var content = no.View.ids2keys(views, update.params);

    for (var i = 0, l = content.length; i < l; i++) {
        var view_id = views[i];
        var key = content[i];
        var view = archive[key];
        if (!archive[key]) {
            view = this.subView( view_id, params );
        }
        view.getUpdateTrees(update, trees);
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

