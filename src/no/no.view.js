/**
    Enum for view status.
    @enum {number}
*/
no.viewStatus = {
    unknown: undefined,
    ok: 1,
    loading: 2,
    error: 3,
    failed: 4
};
// ----------------------------------------------------------------------------------------------------------------- //

/**
    @constructor
    @param {string} id          Уникальный id класса. Важно! Это не id инстанса, у всех блоков этого класса один id.
    @param {!Object} params     Параметры блока (участвуют при построении ключа).
    @param {no.View=} parent    Родительский view.
*/
no.View = function(id, params, parent) {
    this.init(id, params, parent);
}

/**
    Метод инициализации view. Нужен такой отдельный метод, чтобы было проще наследоваться.
    @param {string} id          Уникальный id класса. Важно! Это не id инстанса, у всех блоков этого класса один id.
    @param {!Object} params     Параметры блока (участвуют при построении ключа).
    @param {no.View=} parent    Родительский view.
*/
no.View.prototype.init = function(id, params, parent) {
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

    /** @type {no.viewStatus|undefined} */
    this.status;

    return this;
};

// ----------------------------------------------------------------------------------------------------------------- //

no.View._cache = {};

// ----------------------------------------------------------------------------------------------------------------- //

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
    @param {no.View=} parent
    @return {no.View}
*/
no.View.create = function(view_id, params, parent) {
    var class_ = no.View._classes[ view_id ];
    var view = new class_( view_id, params, parent );
    no.View._cache[view.getKey()] = view;
    return view;
};

no.View.get = function(id, params) {
    var key = no.View.getKey(id, params);
    return no.View._cache[key];
}

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} view_id
    @return {no.View}
*/
no.View.prototype.subView = function(view_id) {
    return no.View.create( view_id, this.params, this );
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
    info || (( info = no.View.info(view_id) ));

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
    return this.status === no.viewStatus.ok;
};

/**
    @return {boolean}
*/
no.View.prototype.needUpdate = function(update) {
    return this.status !== no.viewStatus.ok;
};

// ----------------------------------------------------------------------------------------------------------------- //

no.View.prototype.hide = function() {
    var node = this.node;
    if (node) {
        node.style.display = 'none';
    }
};

no.View.prototype.show = function() {
    var node = this.node;
    if (node) {
        node.style.display = '';
    }
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

        if (!views) {
            return tree;
        }

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
        this.node = no.byClass( 'view-' + this.id, node )[0]; // XXX тут возможное поле для косяков: когда у нас нет this.node и replace = true
        if (!this.node) {
            return;
        }
        this.bindEvents();
    }

    this.processChildren(function(view) {
        view.update(node, update, false);
    });

    if (replace && this.node !== node) {
        this.unbindEvents();
        no.replaceNode(this.node, node);
        this.node = node; // Не забываем обновить саму ссылку на узел.
        this.bindEvents();
    }

    this.status = this._getStatus(update.params);
};

no.View.prototype._getStatus = function(params) {
    var models = this.info.models;
    for (var i = 0; i < models.length; i++) {
        var model_id = models[i];
        var key = no.Model.key(model_id, params);
        if (!no.Model.get(model_id, key)) {
            return no.viewStatus.loading;
        }
    }
    return no.viewStatus.ok;
}

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

//  При описании view можно задать поле events в виде:
//
//  events: {
//      'click a.foo': 'doFoo',
//      'keyup': function(e) { ... }
//  }

no.View.prototype.bindEvents = function() {
    var $node = $(this.node);

    var attachedEvents = this._attachedEvents = [];

    var that = this;
    var events = this.info.events || {};

    for (var event in events) {
        (function(event) {
            // Метод -- это либо строка с именем нужного метода, либо же функция.
            var method = events[event];
            if (typeof method === 'string') {
                method = that[method];
            }

            // Делим строку с event на имя события и опциональный селектор.
            var parts = event.split(/\s/);
            var name = parts.shift();
            var selector = parts.join(' ');

            var handler = function(e) {
                return method.call(that, e);
            };

            // Вешаем событие.
            if (selector) {
                $node.on(name, selector, handler);
            } else {
                $node.on(name, handler);
            }

            // Запоминаем, что повесили, чтобы знать потом, что удалять в unbindEvents.
            attachedEvents.push({
                name: name,
                selector: selector,
                handler: handler
            });
        }(event));
    }
};

no.View.prototype.unbindEvents = function() {
    var $node = $(this.node);

    var attachedEvents = this._attachedEvents = [];

    for (var event in attachedEvents) {
        $node.off( event.name, event.selector, event.handler );
    }

    this._attachedEvents = null;
};

// ----------------------------------------------------------------------------------------------------------------- //

/*
// TODO: Заготовки для хранения связей view2model.

no.View._links = {};

no.View.add = function(view) {
    var model_ids = view.info.models;
    var params = this.params;

    for (var i = 0, l = model_ids.length; i < l; i++) {
        var model_id = model_ids[i];
        var model = no.Model.get( model_id, params );

        no.View._link(model, view);
    }
};

no.View.remove = function(view) {

};

no.View._link = function(model, view) {
    var model_id = model.id;

    var links = no.View._links[ model_id ];
    if (!links) {
        views = no.View._links[ model_id ] = {};
    }

    links[ view.key ] = true;
};

no.View._unlink = function(model, view) {
    var model_id = model.id;

    var links = no.View._links[ model_id ];
    delete links[ view.id ];
    if ( no.object.empty(links) ) {
        delete no.View._links[ model_id ];
        // FIXME: Удалить модель.
    }
};
*/

// ----------------------------------------------------------------------------------------------------------------- //

