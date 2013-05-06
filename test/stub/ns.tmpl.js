beforeEach(function() {

    function genHTML(views) {
        var html = '';
        for (var id in views) {
            html += '<div class="ns-view-' + id + '">';
            html += genHTML(views[id].views);
            html += '</div>';
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
