beforeEach(function() {
    var ns_tmpl = ns.tmpl;
    sinon.stub(ns, 'tmpl', function(json) {
        return ns_tmpl.apply(ns, arguments);
    });
});

afterEach(function() {
    ns.tmpl.restore();
});
