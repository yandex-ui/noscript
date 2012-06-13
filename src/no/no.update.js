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
    var updated = this.view._getRequestViews({
        sync: [],
        async: []
    }, this.layout, this.params);

    var that = this;

    var models = views2models(updated.sync);
    var promise = no.requestModels(models)
        .then(function(r) {
            that._update();
        });

    updated.async.forEach(function(item) {
        var models = views2models( [ item ] );
        no.Promise.wait([
            promise,
            no.requestModels(models)
        ]).then(function(r) {
            that._update(true);
        });
    });

    function views2models(views) {
        var added = {};
        var models = [];

        for (var i = 0, l = views.length; i < l; i++) {
            var viewModels = views[i].models;
            for (var model_id in viewModels) {
                var model = viewModels[model_id];
                var key = model.key;
                if ( !added[key] ) {
                    models.push(model);
                    added[key] = true;
                }
            }
        }

        return models;
    };

};

//  ---------------------------------------------------------------------------------------------------------------  //

no.Update.prototype._update = function(async) {
    //  TODO: Проверить, что не начался уже более новый апдейт.

    var params = this.params;
    var layout = this.layout;

    var tree = {
        views: {},
        models: {},
        params: params,
        location: document.location
    };
    this.view._getUpdateTree(tree, layout, params);

    if ( no.object.isEmpty(tree.views) ) {
        return;
    }

    var html = Yater.run(tree, null, '');
    var node = no.html2node(html);
    this.view._updateHTML(node, layout, params, {
        toplevel: true,
        async: async
    });
};

//  ---------------------------------------------------------------------------------------------------------------  //

})();

