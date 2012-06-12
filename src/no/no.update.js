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

    var promise = no.requestModels( no.View.views2models(updated.sync) ).then(function(r) {
        that._update();
    });

    updated.async.forEach(function(item) {
        var models = no.View.views2models( [ item ] );
        no.Promise.wait([
            promise,
            no.requestModels(models)
        ]).then(function(r) {
            that._update();
        });
    });

};

//  ---------------------------------------------------------------------------------------------------------------  //

no.Update.prototype._update = function() {
    var tree = this.view._getUpdateTree({
        views: {},
        models: {}
    }, this.layout, this.params);

    if ( no.object.isEmpty(tree.views) ) {
        return;
    }

    tree.params = this.params;
    tree.location = document.location;

    var html = Yater.run(tree, null, '');
    var node = no.html2node(html);
    this.view._updateHTML(node, this.layout, this.params, true);
};

//  ---------------------------------------------------------------------------------------------------------------  //

})();

