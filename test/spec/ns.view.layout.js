describe('ns.View dynamic layouts ->', function() {

    describe('Простой случай ->', function() {

        beforeEach(function() {

            ns.layout.define('app', {
                'view1': {
                    'view2': {}
                }
            });

            ns.layout.define('view-layout', {
                'box@': {
                    'view3': {}
                }
            });

            ns.layout.define('view-empty', {
                'box@': {}
            });

            this.view2GetLayoutFn = this.sinon.stub();

            ns.View.define('view1');
            ns.View.define('view2', {
                methods: {
                    patchLayout: function() {
                        return this.getLayout();
                    },

                    getLayout: this.view2GetLayoutFn
                }
            });
            ns.View.define('view3');

            this.view = ns.View.create('view1');

            ns.test.modelsValidAutorespond(this.sinon);
        });

        describe('Отрисовка ->', function() {

            it('Должен создать view3, если отдали такой layout', function() {
                this.view2GetLayoutFn.returns('view-layout');

                return new ns.Update(this.view, ns.layout.page('app'), {})
                    .render()
                    .then(function() {
                        expect(this.view.node.querySelectorAll('.ns-view-view2 .ns-view-view3')).to.have.length(1);
                    }, null, this);
            });

            it('Не должен создать view3, если не отдали layout', function() {
                this.view2GetLayoutFn.returns('view-empty');

                return new ns.Update(this.view, ns.layout.page('app'), {})
                    .render()
                    .then(function() {
                        expect(this.view.node.querySelectorAll('.ns-view-view2 .ns-view-view3')).to.have.length(0);
                    }, null, this);
            });

            it('Должен правильно перерисовывать виды при изменении layout', function() {
                this.view2GetLayoutFn.returns('view-empty');

                return new ns.Update(this.view, ns.layout.page('app'), {})
                    .render()
                    .then(function() {
                        this.view2GetLayoutFn.returns('view-layout');
                        return this.view.update();
                    }, null, this)
                    .then(function() {
                        expect(this.view.node.querySelectorAll('.ns-view-view2 .ns-view-view3.ns-view-visible')).to.have.length(1);

                        this.view2GetLayoutFn.returns('view-empty');
                        return this.view.update();
                    }, null, this)
                    .then(function() {
                        expect(this.view.node.querySelectorAll('.ns-view-view2 .ns-view-view3.ns-view-hidden')).to.have.length(1);
                    }, null, this);
            });

        });

    });

    describe.only('Ограничения ->', function() {

        beforeEach(function() {
            ns.layout.define('app', {
                'view1': {}
            });

            ns.layout.define('view-layout', {
                'view3': {}
            });

            this.sinon.spy(ns.View, 'assert');
        });

        it('должен бросить исключение, если верхушка дерева не box', function() {
            ns.View.define('view1', {
                methods: {
                    patchLayout: function() {
                        return 'view-layout';
                    }
                }
            });

            var view = ns.View.create('view1');
            return new ns.Update(view, ns.layout.page('app'), {}).render()
                .then(function() {
                    return Vow.reject('resolved');
                }, function() {
                    expect(ns.View.assert).to.be.calledWith(false, 12);
                    return Vow.resolve();
                });
        });

        it('должен бросить исключение, если #patchLayout ничего не вернул', function() {
            ns.View.define('view1', {
                methods: {
                    patchLayout: function() {
                        return null;
                    }
                }
            });

            var view = ns.View.create('view1');
            return new ns.Update(view, ns.layout.page('app'), {}).render()
                .then(function() {
                    return Vow.reject('resolved');
                }, function() {
                    expect(ns.View.assert).to.be.calledWith(false, 11);
                    return Vow.resolve();
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
            ns.View.define('vc2-item1-subview', {
                events: {
                    'do-invalidate': 'invalidate'
                }
            });

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

        describe('Перерисовки внутри детей ->', function() {

            function getSubView(node) {
                return node.querySelector('.ns-view-vc2-item1 .ns-view-vc2-item1-subview');
            }

            /*
             Следующий случай:
             VC
                VC-item1
                    VC-item1-subview (invalid)
                    VC-item1-subview2 (valid)
                VC-item2
                    VC-item1-subview (valid)
             */

            beforeEach(function() {
                this.subview = getSubView(this.view.node);

                // инвалидирует дочерний вид элемента коллекции
                ns.events.trigger('do-invalidate');
                // запускаем апдейт, он должен перерисоваться
                return new ns.Update(this.view, ns.layout.page('app'), {}).render();
            });

            it('должен отрисовать вид "vc2-item1-subview"', function() {
                expect(getSubView(this.view.node)).to.be.an.instanceof(Node);
            });

            it('должен перерисовать вид "vc2-item1-subview"', function() {
                expect(getSubView(this.view.node)).to.not.equal(this.subview);
            });

        });

    });

});
