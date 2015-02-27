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

    it('должен переопределить корневой тэг для вьюхи span-tag-view', function(done) {
        ns.View.define('span-tag-view');
        ns.layout.define('span-test', {
            'span-tag-view': {}
        });

        vSpanTagView = ns.View.create('span-tag-view');
        var layout = ns.layout.page('span-test', {});

        new ns.Update(vSpanTagView, layout, {})
            .render()
            .then(
                function() {
                    if (vSpanTagView.node.tagName === 'SPAN') {
                        done();
                    } else {
                        done('Tag name expected to be SPAN');
                    }
                },
                function(e) {
                    done(e);
                }
            );
    });

});

describe('рендеринг ns.ViewCollection через yate', function() {

    beforeEach(function(finish) {
        ns.Model.define('mc-item1', {
            params: { id: null }
        });

        ns.Model.define('mc-item2', {
            params: { id: null }
        });

        ns.Model.define('mc-mixed', {
            split: {
                items: '.item',
                params: { id: '.id' },
                model_id: function(itemData) {
                    return 'mc-item' + itemData.type;
                }
            }
        });

        ns.Model.get('mc-mixed').setData({
            item: [
                {type: 1, id: 1},
                {type: 2, id: 2}
            ]
        });

        ns.ViewCollection.define('vc-mixed', {
            models: ['mc-mixed'],
            split: {
                byModel: 'mc-mixed',
                intoViews: function(model) {
                    return 'vc-mixed-item' + model.get('.type');
                }
            }
        });

        ns.View.define('vc-mixed-item1', {
            models: ['mc-item1']
        });

        ns.View.define('vc-mixed-item2', {
            models: ['mc-item2']
        });

        ns.layout.define('vc-mixed', {
            'vc-mixed': {}
        });
        var layout = ns.layout.page('vc-mixed', {});

        this.view = ns.View.create('vc-mixed');

        new ns.Update(this.view, layout, {})
            .start()
            .then(function() {
                finish();
            }, function(e) {
                finish(e)
            });
    });

    afterEach(function() {
        delete this.view;
        delete this.viewSplitter;
    });

    it('должен правильно вызвать первый тип', function() {
        expect(this.view.node.innerHTML).to.contain('<div>vc-mixed-item1</div>');
    });

    it('должен правильно вызвать второй тип', function() {
        expect(this.view.node.innerHTML).to.contain('<div>vc-mixed-item2</div>');
    });
});


