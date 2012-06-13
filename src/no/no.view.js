(function() {

//  ---------------------------------------------------------------------------------------------------------------  //
//  no.View
//  ---------------------------------------------------------------------------------------------------------------  //

no.View = function() {};

//  ---------------------------------------------------------------------------------------------------------------  //

no.extend(no.View.prototype, no.Events);

//  ---------------------------------------------------------------------------------------------------------------  //

no.View.prototype.init = function(id, params) {
    this.id = id;
    this.params = params || {};

    this.info = no.View.info(id);

    this.key = no.View.getKey(id, params, this.info);

    //  Создаем нужные модели (или берем их из кэша, если они уже существуют).
    var model_ids = this.info.models;
    var models = this.models = {};
    for (var i = 0, l = model_ids.length; i < l; i++) {
        var model_id = model_ids[i];
        models[model_id] = no.Model.create(model_id, params);
    }

    //  Создаем подблоки.
    var view_ids = no.layout.view(id);
    var views = this.views = {};
    for (var view_id in view_ids) {
        if (view_ids[view_id] === 'box') {
            this._addBox(view_id, params);
        } else {
            this._addView(view_id, params);
        }
    }

    this.node = null;
    this.status = 'none';
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.View.getKey = function(id, params, info) {
    //  Ключ можно вычислить даже для неопределенных view,
    //  в частности, для боксов.
    info = info || no.View.info(id) || {};

    var key = 'view=' + id;

    var pNames = info.pNames || [];
    for (var i = 0, l = pNames.length; i < l; i++) {
        var pName = pNames[i];
        var pValue = params[pName];
        if (pValue != null) {
            key += '&' + pName + '=' + pValue;
        }
    }

    return key;
};

//  ---------------------------------------------------------------------------------------------------------------  //

var _infos = {};
var _ctors = {};

no.View.define = function(id, info, ctor) {
    info = info || {};
    ctor = ctor || no.View;

    var models = info.models = info.models || [];

    var params = {};
    for (var i = 0, l = models.length; i < l; i++) {
        no.extend( params, no.Model.info( models[i] ).params );
    }
    if (info.params) {
        no.extend(params, info.params);
    }
    info.pNames = no.object.keys(params);

    _infos[id] = info;
    _ctors[id] = ctor;
};

no.View.info = function(id) {
    return _infos[id];
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.View.create = function(id, params) {
    var ctor = _ctors[id];
    var view = new ctor();
    view.init(id, params);

    return view;
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.View.prototype._getView = function(id, params) {
    var key = no.View.getKey(id, params);
    return this.views[key];
};

no.View.prototype._addView = function(id, params) {
    var view = this._getView(id, params);
    if (!view) {
        view = no.View.create(id, params);
        this.views[view.id] = view;
    }
    return view;
};

no.View.prototype._addBox = function(id, params) {
    var box = this._getView(id, params);
    if (!box) {
        box = new no.Box(id, params);
        this.views[box.id] = box;
    }
    return box;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  FIXME: Нужны три состояния:
//
//    * блок виден;
//    * блок не виден потому, что один из его родителей не виден;
//    * блок не виден потому, что он сам не виден.
//
no.View.prototype._hide = function() {
    var node = this.node;
    if (node) {
        node.style.display = 'none';
    }
};

no.View.prototype._show = function() {
    var node = this.node;
    if (node) {
        node.style.display = '';
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.View.prototype.onhtmlinit = no.pe;

no.View.prototype.onhtmldestroy = no.pe;

no.View.prototype.onshow = no.pe;

no.View.prototype.onhide = no.pe;

no.View.prototype.onrepaint = no.pe;

//  ---------------------------------------------------------------------------------------------------------------  //

//  При описании view можно задать поле events в виде:
//
//  events: {
//      'click a.foo': 'doFoo',
//      'keyup': function(e) { ... }
//  }
//
no.View.prototype._bindEvents = function() {
    var $node = $(this.node);

    var attachedEvents = this._attachedEvents = [];

    var that = this;
    var events = this.info.events = {};

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

            var handler = function() {
                //  FIXME: Откуда это взялось?!
                // Не теряем остальные аргументы.
                var args = Array.prototype.slice.call(arguments, 0);
                return method.apply(that, args);
            };

            // Вешаем событие.
            if (selector) {
                $node.on(name, selector, handler);
            } else {
                $node.on(name, handler);
            }

            // Запоминаем, что повесили, чтобы знать потом, что удалять в _unbindEvents.
            attachedEvents.push({
                name: name,
                selector: selector,
                handler: handler
            });
        }(event));
    }
};

no.View.prototype._unbindEvents = function() {
    var $node = $(this.node);

    var attachedEvents = this._attachedEvents = [];

    for (var event in attachedEvents) {
        $node.off(event.name, event.selector, event.handler);
    }

    this._attachedEvents = null;
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.View.prototype.isValid = function() {
    return ( this.status === 'ok' && this.isModelsValid() );
};

no.View.prototype.isModelsValid = function() {
    var models = this.models;
    for (var id in models) {
        if ( !models[id].isValid() ) {
            return false;
        }
    }

    return true;
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.View.prototype._getRequestViews = function(updated, layout, params) {
    //  В layout может быть объект, true (тоже самое, что и 'show'), 'hide' и 'async'.
    if (layout !== 'hide') {
        if  ( !this.isValid() ) {
            if (layout === 'async') {
                updated.async.push(this);
            } else {
                updated.sync.push(this);
            }
        }

        var views = this.views;
        for (var id in views) {
            views[id]._getRequestViews(updated, layout[id], params);
        }
    }

    return updated;
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.View.prototype._getUpdateTree = function(tree, layout, params) {
    if ( !this.isValid() ) {
        tree.views[this.id] = this._getViewTree(tree.models, layout, params);
    } else {
        var views = this.views;
        for (var id in views) {
            views[id]._getUpdateTree(tree, layout[id], params);
        }
    }

    return tree;
};

no.View.prototype._getViewTree = function(models, layout, params) {
    if ( layout === 'hide' || ( layout === 'async' && !this.isModelsValid() ) ) {
        return false;
    }

    for (var id in this.models) {
        var model = this.models[id];
        if ( model.isValid() ) {
            models[model.id] = model.getData();
        }
    }

    if (typeof layout !== 'object') {
        return true;
    }

    var tree = {};

    var views = this.views;
    for (var id in layout) {
        tree[id] = views[id]._getViewTree(models, layout[id], params);
    }

    return tree;
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.View.prototype._updateHTML = function(node, layout, params, toplevel) {
    if ( !this.isValid() ) {
        var viewNode = no.byClass('view-' + this.id, node)[0];
        if (viewNode) {
            if (toplevel) {
                no.replaceNode(this.node, viewNode);
                toplevel = false;
            }
            this.node = viewNode;

            if ( !viewNode.getAttribute('dummy') ) {
                this.status = 'ok';
            }
        }
    }

    viewNode = viewNode || node;
    var views = this.views;
    for (var id in views) {
        views[id]._updateHTML(viewNode, layout[id], params, toplevel);
    }

};

//  ---------------------------------------------------------------------------------------------------------------  //

})();

