(function() {

//  ---------------------------------------------------------------------------------------------------------------  //
//  no.Update
//  ---------------------------------------------------------------------------------------------------------------  //

no.Update = function(view, layout, params) {
    this.view = view;
    this.layout = layout;
    this.params = params;

    this.id = update_id++;
};

//  ---------------------------------------------------------------------------------------------------------------  //

var update_id = 0;

//  ---------------------------------------------------------------------------------------------------------------  //

no.Update.prototype.start = function() {
    var updated = this.view._getUpdated( [], this.layout, this.params, true );

    var sync = [];
    var async = [];
    for (var i = 0, l = updated.length; i < l; i++) {
        var item = updated[i];
        if (item.layout === false) {
            async.push(item);
        } else {
            sync.push(item);
        }
    }

    var that = this;

    var promise = no.requestModels( items2models(sync) ).then(function(r) {
        that.update(updated);
    });

    async.forEach(function(item) {
        var items = [ item ];
        var models = items2models(items);
        no.Promise.wait([
            promise,
            no.requestModels(models)
        ]).then(function(r) {
            that.update(updated);
        });
    });

};

function items2models(items) {
    var views = items.map(function(item) {
        return item.view;
    });

    return no.View.views2models(views);
}

//  ---------------------------------------------------------------------------------------------------------------  //

no.Update.prototype.update = function(items) {
    console.log( this.view._getUpdated( [], this.layout, this.params, true ) );
    // console.log('update', items);
    var layoutTree = {};
    for (var i = 0, l = items.length; i < l; i++) {
        var item = items[i];

        if (item.toplevel && item.layout !== false) {
            var view = item.view;
            layoutTree[view.id] = view._getTemplateTree(item.layout, this.params);
        }
    }
    // console.log('layoutTree', layoutTree);
    if ( no.object.isEmpty(layoutTree) ) {
        return;
    }

    var models = items2models(items);
    var modelsTree = {};
    for (var i = 0, l = models.length; i < l; i++) {
        var model = models[i];
        if ( model.isValid() ) {
            modelsTree[model.id] = model.getData();
        }
    }

    var tree = {
        params: this.params,
        views: layoutTree,
        models: modelsTree,
        location: document.location
    };

    // console.log(tree);
    var html = Yater.run(tree, null, '');
    var node = no.html2node(html);
    this.updateViews(items, node);
    // console.log(html);

    /*
    console.log('STATUSES');
    for (var i = 0, l = items.length; i < l; i++) {
        var item = items[i];
        if (item.view instanceof no.View) {
            console.log(item.view.id, item.view.status, item.view.isValid());
        }
    }
    */
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.Update.prototype.updateViews = function(items, node) {
    for (var i = items.length; i--; ) {
        var item = items[i];
        // console.log(i, item.view.id);
        item.view.update(node, item.layout, this.params, item.toplevel);
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.View.prototype.update = function(node, layout, params, toplevel) {
    var viewNode = no.byClass('view-' + this.id, node)[0];
    // console.log('View.update', this.id, viewNode);
    if (viewNode) {
        var loading = viewNode.getAttribute('loading');
        // console.log(toplevel, loading);
        if (toplevel && !loading) {
            //  FIXME: onhtmldestroy.
            console.log(this.id);
            no.replaceNode(this.node, viewNode);
            toplevel = false;
        } else {
            this.node = viewNode;
        }
        if (!loading) {
            this.status = 'ok';
        }
    }
};

no.Box.prototype.update = function(node, layout, params, toplevel) {
    if (!this.node) {
        this.node = no.byClass('box-' + this.id, node)[0];
    }

    var views = this.views;
    var newActive = {};
    for (var id in layout) {
        var key = no.View.getKey(id, params);
        newActive[key] = views[key];
    }
    var oldActive = this.active;
    for (var key in oldActive) {
        if ( !(key in newActive) ) {
            views[key]._hide();
        }
    }
    for (var key in newActive) {
        if ( !(key in oldActive) ) {
            views[key]._show();
        }
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

})();

