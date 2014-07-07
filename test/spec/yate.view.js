describe('рендеринг ns.View через yate', function() {

    beforeEach(function(finish) {
        ns.View.define('app');
        ns.View.define('view-test-matcher');

        ns.layout.define('app', {
            'app': {
                'view-test-matcher': {}
            }
        });

        this.view = ns.View.create('app');
        var layout = ns.layout.page('app', {});

        new ns.Update(this.view, layout, {})
            .render()
            .then(function() {
                finish();
            }, function(e) {
                finish(e)
            });
    });

    it('должен заматчить ns.View по названию', function() {
        expect(this.view.node.innerHTML).to.contain('<div>test-view-matcher content</div>');
    });

    it('должен исполнить ns.View в собственном контексте', function() {
        expect(this.view.node.innerHTML).to.contain('<div>test-view-matcher key view=view-test-matcher</div>');
    });

});


