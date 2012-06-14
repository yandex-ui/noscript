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
    if (info.methods) {
        //  Нужно унаследоваться от no.View и добавить в прототип info.models.
        ctor = no.inherits(function() {}, no.View, info.methods);
    } else {
        ctor = ctor || no.View;
    }

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

no.View.prototype._hide = function() {
    if ( this.isLoading() ) {
        return;
    }

    if (this._visible === true) {
        this.node.style.display = 'none';
        this._visible = false;
        this.onhide();
    }
};

//  При создании блока у него this._visible === undefined.
no.View. prototype._show = function() {
    if ( this.isLoading() ) {
        return;
    }

    if (this._visible !== true) {
        this.node.style.display = '';
        this._visible = true;
        this.onshow();
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

function log(s) {
    return function() {
        console.log(s, this.id);
    }
};

no.View.prototype.onhtmlinit = no.pe; // log('onhtmlinit');

no.View.prototype.onhtmldestroy = no.pe; // log('onhtmldestroy');

no.View.prototype.onshow = no.pe; // log('onshow');

no.View.prototype.onhide = no.pe; // log('onhide');

no.View.prototype.onrepaint = no.pe; // log('onrepaint');

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

no.View.prototype.isOk = function() {
    return (this.status === 'ok');
};

no.View.prototype.isLoading = function() {
    return (this.status === 'loading');
};

no.View.prototype.isValid = function() {
    return ( this.isOk() && this.isModelsValid() );
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

//  Вызываем callback для всех подблоков.
no.View.prototype._apply = function(callback) {
    var views = this.views;
    for (var id in views) {
        callback(views[id], id);
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Рекурсивно проходимся по дереву блоков (построенному по layout) и выбираем новые блоки или
//  требующие перерисовки. Раскладываем их в две "кучки": sync и async.
no.View.prototype._getRequestViews = function(updated, layout, params) {
    if  ( !this.isValid() ) {
        if (layout === false) {
            updated.async.push(this);
        } else {
            updated.sync.push(this);
        }
    }

    this._apply(function(view, id) {
        view._getRequestViews(updated, layout[id], params);
    });

    return updated;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Строим дерево для шаблонизатора.
//
//  В tree.views будет дерево блоков, которые нужно сгенерить,
//  причем на верхнем уровне будут т.н. toplevel-блоки --
//  это невалидные блоки и выше их все блоки валидны.
//  В частности, это значит, что если блок невалидный, то он будет перерисован
//  со всеми своими подблоками.
//
//  В tree.models будут все модели, требуемые для этих блоков.
//
no.View.prototype._getUpdateTree = function(tree, layout, params) {
    if ( !this.isValid() ) {
        tree.views[this.id] = this._getViewTree(tree.models, layout, params);
    } else {
        this._apply(function(view, id) {
            view._getUpdateTree(tree, layout[id], params);
        });
    }

    return tree;
};

//  Строим дерево блоков, попутно собираем все нужные для него модели.
no.View.prototype._getViewTree = function(models, layout, params) {
    //  Если это асинхронный блок и для него на самом деле нет еще всех моделей,
    //  помечаем его как асинхронный (false).
    //  Но может случиться так, что асинхронный запрос пришел раньше синхронного,
    //  тогда этот асинхронный блок будет нарисован вместе с остальными синхронными блоками.
    if ( layout === false && !this.isModelsValid() ) {
        return false;
    }

    //  Собираем все нужные модели.
    for (var id in this.models) {
        var model = this.models[id];
        //  FIXME: Кажется, эта провека тут не нужна.
        //  Нужно перед началом апдейта проверять, что все данные в наличии.
        if ( model.isValid() ) {
            models[model.id] = model.getData();
        }
    }

    //  Это блок без подблоков и он не асинхронный.
    if (typeof layout !== 'object') {
        return true;
    }

    //  Собираем дерево рекурсивно из подблоков.
    var tree = {};
    this._apply(function(view, id) {
        tree[id] = view._getViewTree(models, layout[id], params);
    });

    return tree;
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.View.prototype._getDescendants = function(views) {
    views.push(this);
    this._apply(function(view) {
        view._getDescendants(views);
    });

    return views;
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.View.prototype._setNode = function(node) {
    if (node) {
        this.node = node;
        this.status = ( node.getAttribute('loading') ) ? 'loading' : 'ok';
    } else {
        this.status = 'none';
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Обновляем (если нужно) ноду блока.
no.View.prototype._updateHTML = function(node, layout, params, options) {
    var toplevel = options.toplevel;
    var async = options.async;

    var wasLoading = this.isLoading();

    var viewNode;
    //  Если блок уже валидный, ничего не делаем, идем ниже по дереву.
    if ( !this.isValid() ) {
        //  Ищем новую ноду блока.
        viewNode = no.byClass('view-' + this.id, node)[0];
        if (viewNode) {
            //  toplevel-блок -- это невалидный блок, выше которого все блоки валидны.
            //  Для таких блоков нужно вставить их ноду в DOM, а все его подблоки
            //  автоматически попадут на нужное место.
            if (toplevel) {
                if (!wasLoading) {
                    this._unbindEvents();
                    this.onhtmldestroy();
                }

                //  Старая нода показывает место, где должен быть блок.
                //  Если старой ноды нет, то это блок, который вставляется в бокс.
                if (this.node) {
                    no.replaceNode(this.node, viewNode);
                }
                //  Все подблоки уже не toplevel.
                toplevel = false;
            }
            //  Запоминаем новую ноду.
            this._setNode(viewNode);

            if ( this.isOk() ) {
                this._bindEvents();
                this.onhtmlinit();
            }
        } else {
            //  FIXME: А что делать, если новой ноды не обнаружено?
        }
    }

    //  В асинхронном запросе вызываем onrepaint для блоков, которые были заглушкой.
    //  В синхронном запросе вызывает onrepaint для всех блоков.
    //  Кроме того, не вызываем onrepaint для все еще заглушек.
    if ( this.isOk() && ( (async && wasLoading) || !async) ) {
        this.onrepaint();
    }

    //  Т.к. мы, возможно, сделали replaceNode, то внутри node уже может не быть
    //  никаких подблоков. В этом случае, нужно брать viewNode.
    viewNode = viewNode || node;

    //  Рекурсивно идем вниз по дереву.
    this._apply(function(view, id) {
        view._updateHTML(viewNode, layout[id], params, {
            toplevel: toplevel,
            async: async
        });
    });
};

//  ---------------------------------------------------------------------------------------------------------------  //

})();

