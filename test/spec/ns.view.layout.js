describe('ns.View dynamic layouts ->', function() {

    describe('Простой случай ->', function() {

        beforeEach(function() {

            ns.layout.define('app', {
                'view1': {
                    'view2': {}
                }
            });

            ns.layout.define('view2-layout', {
                'view3': {}
            });

            this.view2ModelStateFn = this.sinon.stub();
            ns.Model.define('view2-state', {
                methods: {
                    isOk: this.view2ModelStateFn
                }
            });

            ns.View.define('view1');
            ns.View.define('view2', {
                models: {
                    'view2-state': true
                },
                methods: {
                    patchLayout: function() {
                        if (this.getModel('view2-state').isOk()) {
                            return 'view2-layout';
                        }
                    }
                }
            });
            ns.View.define('view3');

            this.view = ns.View.create('view1');

            ns.test.modelsValidAutorespond(this.sinon);
        });

        describe('Отрисовка ->', function() {

            it('Должен создать view3, если отдали такой layout', function() {
                this.view2ModelStateFn.returns(true);

                return new ns.Update(this.view, ns.layout.page('app'), {})
                    .render()
                    .then(function() {
                        expect(this.view.node.querySelectorAll('.ns-view-view2>.ns-view-view3')).to.have.length(1);
                    }, null, this);
            });

            it('Не должен создать view3, если не отдали layout', function() {
                this.view2ModelStateFn.returns(false);

                return new ns.Update(this.view, ns.layout.page('app'), {})
                    .render()
                    .then(function() {
                        expect(this.view.node.querySelectorAll('.ns-view-view2>.ns-view-view3')).to.have.length(0);
                    }, null, this);
            });

        });

    });

    describe('Коллеция ->', function() {

        beforeEach(function() {

            // layouts
            ns.layout.define('app', {
                'app': {
                    'vc2': {}
                }
            });

            ns.layout.define('vc2-layout-item1', {
                'vc2-item1': {
                    'vc2-item1-subview': {}
                }
            });

            ns.layout.define('vc2-layout-item2', {
                'vc2-item2': {
                    'vc2-item2-subview': {}
                }
            });

            // models
            ns.Model.define('mc2-item', {
                params: { id: null },
                methods: {
                    isItem1: function() {
                        return this.get('.value') === 1;
                    }
                }
            });

            ns.Model.define('mc2', {
                split: {
                    items: '.item',
                    params: { id: '.id' },
                    model_id: 'mc2-item'
                }
            });

            // views
            ns.View.define('app');
            ns.ViewCollection.define('vc2', {
                models: {
                    'mc2': true
                },
                split: {
                    byModel: 'mc2',
                    intoLayouts: function(model) {
                        if (model.isItem1()) {
                            return 'vc2-layout-item1';
                        } else {
                            return 'vc2-layout-item2';
                        }
                    }
                }
            });

            ns.View.define('vc2-item1', { models: ['mc2-item'] });
            ns.View.define('vc2-item1-subview');

            ns.View.define('vc2-item2', { models: ['mc2-item'] });
            ns.View.define('vc2-item2-subview');

            // run
            var modelsMock = {
                '/models/?_m=mc2': {
                    models: [
                        {
                            data: {
                                item: [
                                    {id: 1, value: 1},
                                    {id: 2, value: 2},
                                    {id: 3, value: 3}
                                ]
                            }
                        }
                    ]
                }
            };
            ns.test.modelsValidAutorespondByMock(this.sinon, modelsMock);

            this.view = ns.View.create('app');
            return new ns.Update(this.view, ns.layout.page('app'), {}).render();
        });

        describe('Отрисовка ->', function() {

            it('Должен создать один ".vc2-item1 > .vc2-item1-subview"', function() {
                expect(this.view.node.querySelectorAll('.ns-view-vc2-item1 > .ns-view-vc2-item1-subview')).to.have.length(1);
            });

            it('Должен создать два ".vc2-item2 > .vc2-item2-subview"', function() {
                expect(this.view.node.querySelectorAll('.ns-view-vc2-item2 > .ns-view-vc2-item2-subview')).to.have.length(2);
            });

        });

    });

});
