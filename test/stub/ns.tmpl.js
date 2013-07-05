beforeEach(function() {

    function genViewHTML(id, view) {

        var html = '';
        var clazz = 'ns-view-' + id;
        if (view.async) {
            clazz += ' ns-async';
        }
        if (view.collection) {
            clazz += ' ns-view-container-desc';
        }
        if (view.placeholder) {
            clazz += ' ns-view-placeholder';
        }
        html += '<div class="' + clazz + '" data-key="' + view.key + '">';
        html += genHTML(view.views);
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
