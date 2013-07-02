beforeEach(function() {

    function genViewHTML(id, view) {
        var html = '';
        html += '<div class="ns-view-' + id + (view.async ? ' ns-async' : '') + '" data-key="' + view.key + '">';
        // don't create child views in async state
        if (!view.async) {
            html += genHTML(view.views);
        }
        html += '</div>';

        return html;
    }

    function genHTML(views) {
        var html = '';
        for (var id in views) {
            var view = views[id];

            // collection
            if (Array.isArray(view)) {
                view.forEach(function(collectionItem) {
                    html += genViewHTML(id, collectionItem);
                });

            } else {
                html += genViewHTML(id, view);
            }

        }
        return html;
    }

    sinon.stub(ns, 'tmpl', function(json) {
        return ns.html2node('<div class="root">' + genHTML(json.views) + '</div>');
    });
});

afterEach(function() {
    ns.tmpl.restore();
});
