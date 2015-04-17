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

                        this.view2GetLayoutFn.returns('view-layout');
                        return this.view.update();
                    }, null, this)
                    .then(function() {
                        expect(this.view.node.querySelectorAll('.ns-view-view2 .ns-view-view3.ns-view-visible')).to.have.length(1);
                    }, null, this);
            });

        });

    });

    describe('Ограничения ->', function() {

        beforeEach(function() {
            ns.layout.define('app', {
                'view1': {}
            });

            ns.layout.define('view-layout', {
                'view3': {}
            });

            this.sinon.spy(ns.View, 'assert');

            ns.test.disableExceptionLogger(this.sinon);
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

    describe('Коллеция (истории) ->', function() {

        describe('Элемент коллекции имеет #patchLayout ->', function() {

            beforeEach(function() {
                // layouts
                ns.layout.define('app-vc1', {
                    'app': {
                        'vc1': {}
                    }
                });

                ns.layout.define('app-vc2', {
                    'app': {
                        'vc2': {}
                    }
                });

                ns.layout.define('vc2-item-layout', {
                    'vc2-item-box@': {
                        'vc2-item1': {},
                        'vc2-item2': {}
                    }
                });

                // models
                ns.Model.define('mc2-item', {
                    params: { id: null }
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
                ns.ViewCollection.define('vc1', {
                    models: {
                        'mc2': false
                    },
                    split: {
                        byModel: 'mc2',
                        intoViews: 'vc2-item'
                    }
                });
                ns.ViewCollection.define('vc2', {
                    models: {
                        'mc2': true
                    },
                    split: {
                        byModel: 'mc2',
                        intoViews: 'vc2-item'
                    }
                });

                ns.View.define('vc2-item', {
                    models: {
                        'mc2-item': false
                    },
                    methods: {
                        patchLayout: function() {
                            return 'vc2-item-layout';
                        }
                    }
                });

                ns.View.define('vc2-item1', {
                    models: ['mc2-item']
                });
                ns.View.define('vc2-item2', {
                    models: ['mc2-item']
                });

                ns.Model.get('mc2').setData({
                    item: [
                        {id: 1, value: 1}
                    ]
                });
            });

            describe('Перерисовка после изменений всей коллекции, коллекция перерисовывается, элементы нет ->', function() {

                beforeEach(function() {
                    this.view = ns.View.create('app');
                    return new ns.Update(this.view, ns.layout.page('app-vc2'), {})
                        .render()
                        .then(function() {
                            this.vc2Item1 = this.view.node.querySelector('.ns-view-vc2-item1');
                            this.vc2Item2 = this.view.node.querySelector('.ns-view-vc2-item2');

                            // ставим новые данные
                            ns.Model.get('mc2').setData({
                                item: [
                                    {id: 1, value: 1}
                                ]
                            });

                            // перерисовываем
                            return new ns.Update(this.view, ns.layout.page('app-vc2'), {}).render();
                        }, null, this);
                });

                it('должен перерисовать вид внутри элемента коллекции (vc2-item1)', function() {
                    var vc2Item1 = this.view.node.querySelector('.ns-view-vc2-item1');

                    expect(vc2Item1)
                        .to.be.an.instanceof(Node)
                        .and.to.not.be.equal(this.vc2Item1);
                });

                it('должен перерисовать вид внутри элемента коллекции (vc2-item2)', function() {
                    var vc2Item2 = this.view.node.querySelector('.ns-view-vc2-item2');

                    expect(vc2Item2)
                        .to.be.an.instanceof(Node)
                        .and.to.not.be.equal(this.vc2Item2);
                });

                it('не должен образовать скрытых видов', function() {
                    expect(this.view.node.querySelectorAll('.ns-view-hidden')).to.have.length(0);
                });

            });

            describe('Перерисовка после изменений всей коллекции, коллекция и элементы не перерисовываются ->', function() {

                beforeEach(function() {
                    this.view = ns.View.create('app');
                    return new ns.Update(this.view, ns.layout.page('app-vc1'), {})
                        .render()
                        .then(function() {
                            this.vc2Item1 = this.view.node.querySelector('.ns-view-vc2-item1');
                            this.vc2Item2 = this.view.node.querySelector('.ns-view-vc2-item2');

                            // ставим новые данные
                            ns.Model.get('mc2').setData({
                                item: [
                                    {id: 1, value: 1}
                                ]
                            });

                            // перерисовываем
                            return new ns.Update(this.view, ns.layout.page('app-vc1'), {}).render();
                        }, null, this);
                });

                it('должен перерисовать вид внутри элемента коллекции (vc2-item1)', function() {
                    var vc2Item1 = this.view.node.querySelector('.ns-view-vc2-item1');

                    expect(vc2Item1)
                        .to.be.an.instanceof(Node)
                        .and.to.not.be.equal(this.vc2Item1);
                });

                it('должен перерисовать вид внутри элемента коллекции (vc2-item2)', function() {
                    var vc2Item2 = this.view.node.querySelector('.ns-view-vc2-item2');

                    expect(vc2Item2)
                        .to.be.an.instanceof(Node)
                        .and.to.not.be.equal(this.vc2Item2);
                });

                it('не должен образовать скрытых видов', function() {
                    expect(this.view.node.querySelectorAll('.ns-view-hidden')).to.have.length(0);
                });

            });

        });

        describe('Баг #2 ->', function() {

            /*
            Кейс из бага

            app:
                vc1
                    vc1-item #patchLayout
                        vc1-item-subview1
                            vc1-item-subview3 # перерисовывается при втором ns.Update
                        vc1-item-subview2
                            vc2
                                vc2-item

             */

            beforeEach(function() {
                // layouts
                ns.layout.define('app-vc1', {
                    'app': {
                        'vc1': {}
                    }
                });

                ns.layout.define('layout-vc1-item', {
                    'vc1-item-box@': {
                        'vc1-item-subview1': {
                            'vc1-item-subview3': {}
                        },
                        'vc1-item-subview2': {}
                    }
                });

                ns.layout.define('layout-vc1-item-subview2', {
                    'layout-vc1-item-subview2-box@': {
                        'vc2': {}
                    }
                });

                // models
                ns.Model.define('mc1-item', {
                    params: { id: null }
                });

                ns.Model.define('mc2-item', {
                    params: { id: null }
                });

                ns.Model.define('mc1', {
                    split: {
                        items: '.item',
                        params: { id: '.id' },
                        model_id: 'mc1-item'
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
                ns.ViewCollection.define('vc1', {
                    models: {
                        'mc1': false
                    },
                    split: {
                        byModel: 'mc1',
                        intoViews: function() {
                            return 'vc1-item';
                        }
                    }
                });

                ns.View.define('vc1-item', {
                    methods: {
                        patchLayout: function() {
                            return 'layout-vc1-item';
                        }
                    }
                });

                ns.View.define('vc1-item-subview1');
                ns.View.define('vc1-item-subview3', {
                    events: {
                        'vc1-item-subview3:invalidate': 'invalidate'
                    }
                });

                ns.View.define('vc1-item-subview2', {
                    methods: {
                        patchLayout: function() {
                            return 'layout-vc1-item-subview2';
                        }
                    }
                });

                ns.ViewCollection.define('vc2', {
                    models: {
                        'mc2': true
                    },
                    split: {
                        byModel: 'mc2',
                        intoViews: 'vc2-item'
                    }
                });

                ns.View.define('vc2-item', {
                    models: {
                        'mc2-item': false
                    }
                });

                ns.Model.get('mc1').setData({
                    item: [
                        {id: 1, value: 1}
                    ]
                });

                ns.Model.get('mc2').setData({
                    item: [
                        {id: 2, value: 2}
                    ]
                });

                this.view = ns.View.create('app');
                return new ns.Update(this.view, ns.layout.page('app-vc1'), {}).render();
            });

            it('должен завершить обновление без ошибок', function() {
                ns.events.trigger('vc1-item-subview3:invalidate');
                return new ns.Update(this.view, ns.layout.page('app-vc1'), {}).render();
            });

            it('должен перерисовать "vc1-item-subview3"', function() {
                var oldSubView3 = this.view.node.querySelector('.ns-view-vc1-item-subview3');
                ns.events.trigger('vc1-item-subview3:invalidate');
                return new ns.Update(this.view, ns.layout.page('app-vc1'), {}).render().then(function() {
                    var newSubView3 = this.view.node.querySelector('.ns-view-vc1-item-subview3');
                    expect(newSubView3)
                        .to.be.an.instanceof(Node)
                        .and.to.not.be.equal(oldSubView3);
                }, null, this);
            });

        });

    });

});
