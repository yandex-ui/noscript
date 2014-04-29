it('Check yate templates are ready [run `make yate` if it fails]', function() {
    expect(yr.run('main', {}, 'check-yate-is-ready')).to.be.equal('Ready');
});

it('Check ns-view-call', function(finish) {
    var result = yr.run('main', {}, 'check-yate-is-ready');

    ns.View.define('app-ns-view-call', {
        methods: {
            someViewMethod: function() {
                return 'method result';
            }
        }
    });
    ns.layout.define('app', {
        'app-ns-view-call': {}
    });

    this.APP = ns.View.create('app-ns-view-call');
    var that = this;
    new ns.Update(
        this.APP,
        ns.layout.page('app', {}),
        {}
    ).start().then(function() {
        var html = that.APP.node.innerHTML;
        expect(html).to.contain('<div class="js-test-call">method result</div>');
        finish();
    }, finish);
});
