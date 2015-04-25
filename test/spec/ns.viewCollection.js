describe('ns.ViewCollection', function() {
    describe('ns.ViewCollection.define', function() {
        beforeEach(function() {
            this.sinon.spy(ns.ViewCollection, 'define');

            ns.Model.define('model');
            ns.Model.define('model-collection1', {isCollection: true});
            ns.Model.define('model-collection2', {isCollection: true});
        });

        it('should throw exception if I define viewCollection without models', function() {
            try {
                ns.ViewCollection.define('collection');
            } catch(e) {}

            expect(ns.ViewCollection.define.getCall(0).threw()).to.be.equal(true);
        });

        it('should throw exception if I define viewCollection without "split" section', function() {
            try {
                ns.ViewCollection.define('collection', {
                    models: [ 'model' ]
                });
            } catch(e) {}

            expect(ns.ViewCollection.define.getCall(0).threw()).to.be.equal(true);
        });

        it('should throw exception if I define viewCollection with ModelCollection but without split.intoViews', function() {
            try {
                ns.ViewCollection.define('collection', {
                    models: [ 'model-collection1' ],
                    split: {
                        byModel: 'model-collection1'
                    }
                });
            } catch(e) {}

            expect(ns.ViewCollection.define.getCall(0).threw()).to.be.equal(true);
        });

        it('should throw exception if I define viewCollection with ModelCollection but without split.byModel', function() {
            try {
                ns.ViewCollection.define('collection', {
                    models: [ 'model-collection1' ],
                    split: {
                        intoViews: 'collection-item'
                    }
                });
            } catch(e) {}

            expect(ns.ViewCollection.define.getCall(0).threw()).to.be.equal(true);
        });

        it('should throw exception if I define viewCollection with ModelCollection and invalid split.byModel', function() {
            try {
                ns.ViewCollection.define('collection', {
                    models: [ 'model-collection1' ],
                    split: {
                        byModel: 'there-is-no-such-model-in-declaration',
                        intoViews: 'collection-item'
                    }
                });
            } catch(e) {}

            expect(ns.ViewCollection.define.getCall(0).threw()).to.be.equal(true);
        });

        it('should not throw exception if I define viewCollection with ModelCollection and valid "split" section', function() {
            try {
                ns.ViewCollection.define('collection', {
                    models: [ 'model-collection1' ],
                    split: {
                        byModel: 'model-collection1',
                        intoViews: 'collection-item'
                    }
                });
            } catch(e) {}

            expect(ns.ViewCollection.define.getCall(0).threw()).to.be.equal(false);
        });

    });

    describe('Наследование от другой коллекции', function() {

        beforeEach(function() {

            ns.View.define('vc-item');
            ns.Model.define('mc-item');
            ns.Model.define('mc', {
                split: {
                    model_id: 'mc-item'
                }
            });

            var parentMegaView = ns.ViewCollection.define('parentMegaView', {
                methods: {
                    superMethod: function() {}
                },
                models: ['mc'],
                split: {
                    byModel: 'mc',
                    intoViews: 'vc-item'
                }
            });

            // inherits by class reference
            ns.ViewCollection.define('childMegaViewByFunction', {
                methods: {
                    oneMore: function() {}
                },
                models: ['mc'],
                split: {
                    byModel: 'mc',
                    intoViews: 'vc-item'
                }
            }, parentMegaView);

            // inherits by view name
            ns.ViewCollection.define('childMegaViewByName', {
                methods: {
                    oneMore: function() {}
                },
                models: ['mc'],
                split: {
                    byModel: 'mc',
                    intoViews: 'vc-item'
                }
            }, 'parentMegaView');
        });

        afterEach(function() {
            delete this.view;
        });

        var tests = {
            'childMegaViewByFunction': 'inherits by class reference',
            'childMegaViewByName': 'inherits by view name'
        };

        for (var viewName in tests) {
            (function(viewName, suiteName) {

                describe(suiteName, function() {

                    beforeEach(function() {
                        this.view = ns.View.create(viewName, {});
                    });

                    it('наследуемый view должен быть ns.View', function() {
                        expect(this.view instanceof ns.ViewCollection).to.be.equal(true);
                    });

                    it('методы наследуются от базового view', function() {
                        expect(this.view.superMethod).to.be.a('function');
                    });

                    it('методы от базового view не ушли в ns.View', function() {
                        expect(ns.View.prototype.superMethod).to.be.an('undefined');
                    });

                    it('методы от базового view не ушли в ns.ViewCollection', function() {
                        expect(ns.ViewCollection.prototype.superMethod).to.be.an('undefined');
                    });

                    it('методы ns.View на месте', function() {
                        expect(this.view.isOk).to.be.a('function');
                    });

                    it('методы ns.ViewCollection на месте', function() {
                        expect(this.view.isValidDesc).to.be.a('function');
                    });

                    it('методы из info.methods тоже не потерялись', function() {
                        expect(this.view.oneMore).to.be.a('function');
                    });

                });

            })(viewName, tests[viewName]);
        }
    });

    describe('Разнородная коллекция', function() {

        beforeEach(function(finish) {
            ns.Model.define('mc-item1', {
                params: { id: null }
            });

            ns.Model.define('mc-item2', {
                params: { id: null }
            });

            ns.Model.define('mc-item3', {
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
                    {type: 2, id: 2},
                    {type: 3, id: 3}
                ]
            });

            this.viewSplitter = this.sinon.spy(function(model) {
                if (model.id === 'mc-item3') {
                    return false;
                }
                return 'vc-item' + model.get('.type');
            });

            ns.ViewCollection.define('vc-mixed', {
                models: ['mc-mixed'],
                split: {
                    byModel: 'mc-mixed',
                    intoViews: this.viewSplitter
                }
            });

            ns.View.define('vc-item1', {
                models: ['mc-item1']
            });

            ns.View.define('vc-item2', {
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

        it('должен вызвать функцию из intoViews для каждого элемента', function() {
            expect(this.viewSplitter).to.have.callCount(3);
        });

        it('должен вызвать функцию из intoViews в контексте коллекции', function() {
            expect(this.viewSplitter).to.be.calledOn(this.view);
        });

        it('должен создать элемент vc-item1', function() {
            expect(this.view.node.getElementsByClassName('ns-view-vc-item1')).to.have.length(1);
        });

        it('должен создать элемент vc-item2', function() {
            expect(this.view.node.getElementsByClassName('ns-view-vc-item2')).to.have.length(1);
        });

        it('не должен создать элемент vc-item3', function() {
            expect(this.view.node.getElementsByClassName('ns-view-vc-item3')).to.have.length(0);
        });

    });

    describe('#invalidate / #invalidateAll.', function() {

        beforeEach(function() {
            this.sinon.spy(ns.View.prototype, 'invalidate');
            ns.layout.define('app', {
                'vc': {}
            });

            ns.Model.define('mc', {
                split: {
                    items: '.items',
                    params: {
                        'id': '.id'
                    },
                    model_id: 'mc-item'
                }
            });
            ns.Model.define('mc-item', {
                params: {
                    id: null
                }
            });
            ns.Model.get('mc').setData({
                items: [
                    {id: 1, val: 1},
                    {id: 2, val: 2}
                ]
            });

            ns.ViewCollection.define('vc', {
                models: ['mc'],
                split: {
                    byModel: 'mc',
                    intoViews: 'vc-item'
                }
            });

            ns.View.define('vc-item', {
                models: ['mc-item']
            });

            this.view = ns.View.create('vc');

            return new ns.Update(
                this.view,
                ns.layout.page('app'),
                {}
            ).render();
        });

        it('#invalidate должен инвалидировать вид', function() {
            this.view.invalidate();
            expect(this.view.isValid()).to.be.equal(false);
        });

        it('#invalidate не должен инвалидировать дочерние виды', function() {
            this.view.invalidate();
            for (var key in this.view.views) {
                expect(this.view.views[key].isValid()).to.be.equal(true);
            }
        });

        it('#invalidateAll должен инвалидировать вид', function() {
            this.view.invalidateAll();
            expect(this.view.isValid()).to.be.equal(false);
        });

        it('#invalidateAll должен инвалидировать дочерние виды', function() {
            this.view.invalidateAll();
            for (var key in this.view.views) {
                expect(this.view.views[key].isValid()).to.be.equal(false);
            }
        });

    });

    describe('#isValidSelf', function() {

        describe('Контроль количества вызовов', function() {

            beforeEach(function() {
                ns.Model.define('m-collection', {
                    isCollection: true
                });

                ns.Model.define('m-collection-item', {
                    params: {
                        p: null
                    }
                });

                var mc = ns.Model.get('m-collection');
                // insert first item
                mc.insert([
                    ns.Model.get('m-collection-item', {p: 1}).setData({data: 1}),
                    ns.Model.get('m-collection-item', {p: 2}).setData({data: 2}),
                    ns.Model.get('m-collection-item', {p: 3}).setData({data: 3})
                ]);

                ns.ViewCollection.define('v-collection', {
                    models: [ 'm-collection' ],
                    split: {
                        byModel: 'm-collection',
                        intoViews: 'v-collection-item'
                    }
                });
                ns.View.define('v-collection-item', {
                    models: [ 'm-collection-item' ]
                });

                this.VC = ns.View.create('v-collection');
                this.sinon.spy(this.VC, 'isValidSelf');

                return this.VC.update();
            });

            it('должен сделать 5 вызовов при первой отрисовке', function() {
                // проверка бага, что VC.isValidSelf вызывался при приходе по каждому ребенку
                expect(this.VC.isValidSelf).to.have.callCount(5);
            });

        });

    });

    describe('redraw ViewCollection within parent view', function() {

        beforeEach(function(finish) {

            // define models
            ns.Model.define('m-collection', {
                isCollection: true
            });

            ns.Model.define('m-collection-item', {
                params: {
                    p: null
                }
            });

            this.model = ns.Model.get('m-collection');
            // insert first item
            this.model.insert(ns.Model.get('m-collection-item', {p: 1}).setData({data: 1}));

            ns.Model.define('wrap-model');
            ns.Model.get('wrap-model', {}).setData({data: true});

            // define views
            ns.View.define('app');
            ns.View.define('wrap', {
                models: ['wrap-model']
            });
            ns.ViewCollection.define('v-collection', {
                models: [ 'm-collection' ],
                split: {
                    byModel: 'm-collection',
                    intoViews: 'v-collection-item'
                }
            });
            ns.View.define('v-collection-item', {
                models: [ 'm-collection-item' ]
            });
            this.APP = ns.View.create('app');

            // define layout
            ns.layout.define('app', {
                'app': {
                    'wrap': {
                        'v-collection': {}
                    }
                }
            });

            // first rewdraw
            var layoutParams = {};
            var layout = ns.layout.page('app', layoutParams);

            new ns.Update(this.APP, layout, layoutParams)
                .start()
                .done(function() {
                    // set fake data to invalidate wrap-view
                    ns.Model.get('wrap-model').set('.fake', 1);

                    // start update to redraw wrap-view
                    new ns.Update(this.APP, layout, layoutParams)
                        .start()
                        .done(function() {
                            finish();
                        });
                }.bind(this));
        });

        it('should have 1 v-collection-item after redraw', function() {
            expect(this.APP.node.getElementsByClassName('ns-view-v-collection')[0].childNodes).to.have.length(1);
        });

    });

    describe('ViewCollection view in case on ModelCollection changes', function() {

        function shouldSaveVCollectionNode() {
            it('should save view-collection node', function() {
                var newVCollectionNode = this.APP.node.getElementsByClassName('ns-view-v-collection')[0];
                expect(newVCollectionNode).to.be.equal(this.vCollectionNodeList[0])
            });
        }

        function shouldSaveNVCollectionItemNode(newPosition, oldPosition) {
            it('should save view-collection-item[' + oldPosition + '] node', function() {
                oldPosition = typeof oldPosition === 'number' ? oldPosition : newPosition;
                var newVCollectionItemNode = this.APP.node.getElementsByClassName('ns-view-v-collection-item')[newPosition];
                expect(newVCollectionItemNode).to.be.equal(this.vCollectionItemNodeList[oldPosition]);
            });
        }

        function shouldHaveNViewCollectionItemNodes(n) {
            it('should have ' + n + ' view-collection-item nodes', function() {
                expect(
                    this.APP.node.getElementsByClassName('ns-view-v-collection-item')
                ).to.have.length(n)
            });
        }

        beforeEach(function(finish) {

            // define models
            ns.Model.define('m-collection', {
                isCollection: true
            });

            ns.Model.define('m-collection-item', {
                params: {
                    p: null
                }
            });

            // insert items in collection
            ns.Model.get('m-collection').insert([
                ns.Model.get('m-collection-item', {p: 1}).setData({data: 1}),
                ns.Model.get('m-collection-item', {p: 2}).setData({data: 2})
            ]);

            // define views
            ns.View.define('app');
            ns.ViewCollection.define('v-collection', {
                models: [ 'm-collection' ],
                split: {
                    byModel: 'm-collection',
                    intoViews: 'v-collection-item'
                }
            });
            ns.View.define('v-collection-item', {
                models: [ 'm-collection-item' ]
            });

            // define layout
            ns.layout.define('app', {
                'app': {
                    'v-collection': {}
                }
            });

            this.sinon.spy(ns.request, 'models');

            // initiate first rendering
            this.APP = ns.View.create('app');

            var layout = ns.layout.page('app', {});
            new ns.Update(this.APP, layout, {})
                .start()
                .done(function() {
                    var i, j;

                    // copy nodes for phantom
                    var vCollection = this.APP.node.getElementsByClassName('ns-view-v-collection');
                    this.vCollectionNodeList = [];
                    for (i = 0, j = vCollection.length; i < j; i++) {
                         this.vCollectionNodeList.push(vCollection[i]);
                    }

                    var vCollectionItem = this.APP.node.getElementsByClassName('ns-view-v-collection-item');
                    this.vCollectionItemNodeList = [];
                    for (i = 0, j = vCollectionItem.length; i < j; i++) {
                         this.vCollectionItemNodeList.push(vCollectionItem[i]);
                    }

                    finish();
                }.bind(this));
        });

        afterEach(function() {
            delete this.APP;
            delete this.vCollectionNodeList;
            delete this.vCollectionItemNodeList;
        });

        describe('first rendering', function() {

            it('should have view-collection node', function() {
                expect(
                    this.vCollectionNodeList
                ).to.have.length(1)
            });

            shouldHaveNViewCollectionItemNodes(2);

        });

        describe('refresh layout without models changes', function() {

            beforeEach(function(finish) {
                var layout = ns.layout.page('app', {});
                new ns.Update(this.APP, layout, {})
                    .start()
                    .done(function() {
                        finish();
                    });
            });

            shouldSaveVCollectionNode();
            shouldSaveNVCollectionItemNode(0);
            shouldSaveNVCollectionItemNode(1);

        });

        describe('refresh layout after model-item update', function() {

            beforeEach(function(finish) {
                // update model collection item
                ns.Model.get('m-collection-item', {p: 1}).set('.newdata', 1);

                // start update to redraw views
                var layout = ns.layout.page('app', {});
                new ns.Update(this.APP, layout, {})
                    .start()
                    .then(function() {
                        finish();
                    }, function(e) {
                        finish(e);
                    });
            });

            shouldSaveVCollectionNode();
            shouldHaveNViewCollectionItemNodes(2);

            it('should render new view-collection-item[0] node', function() {
                var newVCollectionItemNode = this.APP.node.getElementsByClassName('ns-view-v-collection-item')[0];
                expect(newVCollectionItemNode).to.not.be.equal(this.vCollectionItemNodeList[0])
            });

            shouldSaveNVCollectionItemNode(1);

        });

        describe('refresh layout after insert new model-item ->', function() {

            describe('вставка в конец списка ->', function() {

                beforeEach(function() {
                    // insert another model-item in collection
                    ns.Model.get('m-collection').insert([
                        ns.Model.get('m-collection-item', {p: 3}).setData({data: 3})
                    ]);

                    // start update to redraw views
                    var layout = ns.layout.page('app', {});
                    return new ns.Update(this.APP, layout, {}).render();
                });

                shouldHaveNViewCollectionItemNodes(3);
                shouldSaveVCollectionNode();
                shouldSaveNVCollectionItemNode(0);
                shouldSaveNVCollectionItemNode(1);

            });

            describe('вставка в начало списка ->', function() {

                beforeEach(function() {
                    // insert another model-item in collection
                    ns.Model.get('m-collection').insert([
                        ns.Model.get('m-collection-item', {p: 3}).setData({data: 3})
                    ], 0);

                    // start update to redraw views
                    var layout = ns.layout.page('app', {});
                    return new ns.Update(this.APP, layout, {}).render();
                });

                shouldHaveNViewCollectionItemNodes(3);
                shouldSaveVCollectionNode();
                // первый элемент списка стал вторым
                shouldSaveNVCollectionItemNode(1, 0);
                // второй элемент списка стал третьим
                shouldSaveNVCollectionItemNode(2, 1);

            });

        });

        describe('refresh layout after remove model-item', function() {
            beforeEach(function(finish) {

                // remove model-item from collection
                ns.Model.get('m-collection').remove(0);

                // start update to redraw views
                var layout = ns.layout.page('app', {});
                new ns.Update(this.APP, layout, {})
                    .start()
                    .done(function() {
                        finish();
                    });
            });

            shouldHaveNViewCollectionItemNodes(1);
            shouldSaveVCollectionNode();

            it('should save view-collection-item[1] node', function() {
                var newVCollectionItemNode = this.APP.node.getElementsByClassName('ns-view-v-collection-item')[0];
                // we've removed first item, so new item[0] should be the same with old[1]
                expect(newVCollectionItemNode).to.be.equal(this.vCollectionItemNodeList[1])
            });

        });

        describe('refresh layout after model-item destroy', function() {
            beforeEach(function(finish) {
                var that = this;
                var layout = ns.layout.page('app', {});

                ns.Model.destroy(ns.Model.get('m-collection-item', {p: 1}));

                new ns.Update(this.APP, layout, {})
                    .start()
                    .done(function() {
                        finish();
                    });
            });

            it('should save view-collection-item[1] node', function() {
                var newVCollectionItemNode = this.APP.node.getElementsByClassName('ns-view-v-collection-item')[0];
                expect(newVCollectionItemNode).to.be.equal(this.vCollectionItemNodeList[1])
            });
        });

        describe('refresh layout after model-collection update', function() {

            beforeEach(function(finish) {
                // touching model after a small timeout to guarantee, that
                // model and view will have different timeout attribute
                window.setTimeout(function() {
                    ns.Model.get('m-collection').touch();

                    // start update to redraw a core view
                    var layout = ns.layout.page('app', {});
                    new ns.Update(this.APP, layout, {})
                        .start()
                        .done(function() {
                            finish();
                        });
                }.bind(this), 10);
            });

            it('should render new view-collection node', function() {
                var newVCollectionNode = this.APP.node.getElementsByClassName('ns-view-v-collection')[0];
                expect(newVCollectionNode).to.not.be.equal(this.vCollectionNodeList[0])
            });

            shouldSaveNVCollectionItemNode(0);
            shouldSaveNVCollectionItemNode(1);

        });

    });

    describe('ViewCollection update after ModelCollection destruction', function() {
        beforeEach(function(finish) {

            // define models
            ns.Model.define('mCollection', {
                split: {
                    model_id: 'mItem',
                    items: '.data',
                    params: {
                        id: '.id'
                    }
                }
            });

            ns.Model.define('mItem', {
                params: {
                    id: null
                }
            });

            // set data to collection
            ns.Model.get('mCollection').setData({data: [{id: '0'}, {id: '1'}]});

            // define views
            ns.View.define('app');

            ns.ViewCollection.define('vCollection', {
                models: [ 'mCollection' ],
                split: {
                    byModel: 'mCollection',
                    intoViews: 'vItem'
                }
            });
            ns.View.define('vItem', {
                models: [ 'mItem' ]
            });

            // define layout
            ns.layout.define('app', {
                'app': {
                    'vCollection': {}
                }
            });

            // initiate first rendering
            this.APP = ns.View.create('app');
            var layout = ns.layout.page('app', {});
            new ns.Update(this.APP, layout, {})
                .start()
                .done(function() {
                    ns.Model.destroy(ns.Model.get('mCollection'));
                    ns.Model.destroy(ns.Model.get('mItem', {id: '0'}));
                    ns.Model.destroy(ns.Model.get('mItem', {id: '1'}));

                    ns.Model.get('mCollection').setData({data: [{id: '2'}]});

                    new ns.Update(this.APP, layout, {})
                        .start()
                        .done(function() {
                            finish();
                        }.bind(this));
                }.bind(this));
        });

        afterEach(function() {
            delete this.APP;
        });

        it('shouldn`t find destroyed models', function() {
            expect(ns.Model.getValid('mItem', {id: '0'})).not.to.be.equal(true);
            expect(ns.Model.getValid('mItem', {id: '1'})).not.to.be.equal(true);
        });

        it('should have 1 node for view vItem', function() {
            expect(this.APP.node.querySelectorAll('.ns-view-vItem').length).to.be.equal(1);
        });

    });

    describe('Update of recursive view collections', function() {
        before(function() {
            ns.Model.define('m-collection-2', {
                params: {
                    id: null
                },
                split: {
                    model_id: 'm-collection-2',
                    items: '.data',
                    params: {
                        id: '.id'
                    }
                }
            });

            // recursive view
            ns.ViewCollection.define('v-collection-2', {
                models: [ 'm-collection-2' ],
                split: {
                    byModel: 'm-collection-2',
                    intoViews: 'v-collection-2'
                },
                events: {
                    'ns-view-init': 'oninit'
                },
                methods: {
                    oninit: function() {
                        if (!this.views) {
                            this.views = {};
                        }
                    }
                }
            });

            ns.View.define('app');
            this.APP = ns.View.create('app');

            ns.layout.define('app-2', {
                'app': {
                    'v-collection-2': {}
                }
            });
        });

        beforeEach(function(finish) {
            this.model = ns.Model.get('m-collection-2', {id: '0'}).setData({
                data: [{
                    data: [],
                    title: '1',
                    id: '1'
                }, {
                    data: [],
                    title: '2',
                    id: '2'
                }],
                title: '0'
            });

            // first rewdraw
            var layout = ns.layout.page('app-2');
            new ns.Update(this.APP, layout, {id: '0'})
                .start()
                .done(function() {
                    this.collectionViewNode = this.APP.node.getElementsByClassName('ns-view-v-collection-2')[0];

                    // Load subcollection data.
                    ns.Model.get('m-collection-2', {id: '1'}).setData({
                        data: [
                            {
                                data: [{
                                    data: [],
                                    title: '1.1.1',
                                    id: '1.1.1'
                                }],
                                title: '1.1',
                                id: '1.1'
                            },
                            {
                                data: [],
                                title: '1.2',
                                id: '1.2'
                            }
                        ],
                        title: '1',
                        id: '1'
                    });

                    // start update to redraw views
                    var layout = ns.layout.page('app-2');
                    new ns.Update(this.APP, layout, {id: '0'})
                        .start()
                        .done(function() {
                            // Skip this update loop.

                            var layout = ns.layout.page('app-2');
                            new ns.Update(this.APP, layout, {id: '0'})
                                .start()
                                .done(function() {
                                    // Edit subcollection later on.
                                    ns.Model.get('m-collection-2', {id: '1.1'}).set('.title', '1.1-edit');

                                    var layout = ns.layout.page('app-2');
                                    new ns.Update(this.APP, layout, {id: '0'})
                                        .start()
                                        .done(function() {
                                            finish();
                                        });
                                }.bind(this));
                        }.bind(this));
                }.bind(this));
        });

        it('should correctly update nested nodes', function() {
            var cols = {};
            cols['1'] = $('.ns-view-v-collection-2[data-key="view=v-collection-2&id=1"]', this.collectionViewNode);
            cols['2'] = $('.ns-view-v-collection-2[data-key="view=v-collection-2&id=2"]', this.collectionViewNode);
            cols['1.1'] = cols['1'].find('.ns-view-v-collection-2[data-key="view=v-collection-2&id=1.1"]');
            cols['1.2'] = cols['1'].find('.ns-view-v-collection-2[data-key="view=v-collection-2&id=1.2"]');
            cols['1.1.1'] = cols['1.1'].find('.ns-view-v-collection-2[data-key="view=v-collection-2&id=1.1.1"]');
            cols['2.x'] = cols['2'].find('.ns-view-v-collection-2');

            expect(cols['1'].length).to.be.equal(1);
            expect(cols['2'].length).to.be.equal(1);
            expect(cols['1.1'].length).to.be.equal(1);
            expect(cols['1.2'].length).to.be.equal(1);
            expect(cols['1.1.1'].length).to.be.equal(1);
            expect(cols['2.x'].length).to.be.equal(0);
        });
    });

    describe('Update of nested view collections', function() {
        before(function() {
            ns.Model.define('nested-model', {
                params: {
                    id: null
                }
            });

            ns.Model.define('outer-collection-model', {
                isCollection: true
            });

            ns.Model.define('nested-collection', {
                isCollection: true,
                params: {
                    id: null
                }
            });

            ns.View.define('nested-view-collection-item', {
                models: [ 'nested-model' ]
            });

            ns.ViewCollection.define('nested-view-collection', {
                models: [ 'nested-collection' ],
                split: {
                    byModel: 'nested-collection',
                    intoViews: 'nested-view-collection-item'
                }
            });

            ns.ViewCollection.define('outer-view-collection', {
                models: [ 'outer-collection-model' ],
                split: {
                    byModel: 'outer-collection-model',
                    intoViews: 'nested-view-collection'
                }
            });

            ns.View.define('app');
            this.APP = ns.View.create('app');

            ns.layout.define('app-3', {
                'app': 'outer-view-collection'
            });
        });

        beforeEach(function(finish) {
            var parent = ns.Model.get('outer-collection-model');

            var itemA = ns.Model.get('nested-model', {id: 'A'}).setData({});
            var itemB = ns.Model.get('nested-model', {id: 'B'}).setData({});
            var itemC = ns.Model.get('nested-model', {id: 'C'}).setData({});

            var childA = ns.Model.get('nested-collection', {id: 'A'});
            var childB = ns.Model.get('nested-collection', {id: 'B'});

            childA.insert([itemA]);
            childB.insert([itemB, itemC]);

            parent.insert([childA, childB]);

            var layout = ns.layout.page('app-3');
            new ns.Update(this.APP, layout, {})
                .start()
                .done(function() {
                    var itemD = ns.Model.get('nested-model', {id: 'D'}).setData({});
                    var childC = ns.Model.get('nested-collection', {id: 'C'});

                    childC.insert([itemD]);
                    parent.insert(childC, 2);

                    var layout = ns.layout.page('app-3');
                    new ns.Update(this.APP, layout, {})
                        .start()
                        .done(function() {
                            this.collectionViewNode = this.APP.node.querySelector('.ns-view-outer-view-collection');
                            finish();
                        }.bind(this));
                }.bind(this));
        });

        it('should correctly update nested nodes', function() {
            var childNodesContainer = this.collectionViewNode.firstChild.childNodes;
            var childANode = childNodesContainer[0];
            var childBNode = childNodesContainer[1];
            var childCNode = childNodesContainer[2];

            expect(childANode.querySelector('.ns-view-container-desc').childNodes).to.have.length(1);
            expect(childBNode.querySelector('.ns-view-container-desc').childNodes).to.have.length(2);
            expect(childCNode.querySelector('.ns-view-container-desc').childNodes).to.have.length(1);
        });
    });

    describe('Перерисовка вложенных коллекций (VC1_INVALID -> VC2_VALID -> VC2_ITEM_SOME_INVALID) ->', function() {

        beforeEach(function() {
            ns.Model.define('nested-model', {
                params: {
                    id: null
                }
            });

            ns.Model.define('outer-collection-model', {
                isCollection: true
            });

            ns.Model.define('nested-collection', {
                isCollection: true,
                params: {
                    id: null
                }
            });

            ns.View.define('nested-view-collection-item', {
                models: [ 'nested-model' ]
            });

            ns.ViewCollection.define('nested-view-collection', {
                models: [ 'nested-collection' ],
                split: {
                    byModel: 'nested-collection',
                    intoViews: 'nested-view-collection-item'
                }
            });

            ns.ViewCollection.define('outer-view-collection', {
                models: [ 'outer-collection-model' ],
                split: {
                    byModel: 'outer-collection-model',
                    intoViews: 'nested-view-collection'
                }
            });

            ns.View.define('app');
            this.APP = ns.View.create('app');

            ns.layout.define('app-3', {
                'app': 'outer-view-collection'
            });

            var parent = ns.Model.get('outer-collection-model');

            var itemA = ns.Model.get('nested-model', {id: 'A'}).setData({});
            var itemB = ns.Model.get('nested-model', {id: 'B'}).setData({});
            var itemC = ns.Model.get('nested-model', {id: 'C'}).setData({});

            var childA = ns.Model.get('nested-collection', {id: 'A'});
            var childB = ns.Model.get('nested-collection', {id: 'B'});

            childA.insert([itemA]);
            childB.insert([itemB, itemC]);

            parent.insert([childA, childB]);

            var layout = ns.layout.page('app-3');
            return new ns.Update(this.APP, layout, {}).render();
        });

        describe('невалиден первый элемент вложенной коллекции ->', function() {

            beforeEach(function() {
                ns.Model.get('outer-collection-model').set('.foo', 'bar');
                ns.Model.get('nested-model', {id: 'B'}).set('.foo', 'bar');

                this.findChilds = function() {
                    return [
                        this.APP.node.querySelector('[data-key="view=nested-view-collection-item&id=B"]'),
                        this.APP.node.querySelector('[data-key="view=nested-view-collection-item&id=C"]')
                    ];
                };

                this.oldChilds = this.findChilds();

                var layout = ns.layout.page('app-3');
                return new ns.Update(this.APP, layout, {}).render();
            });

            it('вложенная коллекция должна иметь два элемента', function() {
                expect(this.APP.node.querySelectorAll('[data-key="view=nested-view-collection-item&id=B"]'), 'nested-view-collection-item&id=B').to.have.length(1);
                expect(this.APP.node.querySelectorAll('[data-key="view=nested-view-collection-item&id=C"]'), 'nested-view-collection-item&id=C').to.have.length(1);
            });

            it('вложенная коллекция должна перерисовать первый элемент', function() {
                var newNode = this.APP.node.querySelector('[data-key="view=nested-view-collection-item&id=B"]').getAttribute('data-random');
                var oldNode = this.oldChilds[0].getAttribute('data-random');
                expect(newNode).to.not.be.equal(oldNode);
            });

            it('вложенная коллекция должна сохранить второй элемент', function() {
                expect(this.APP.node.querySelector('[data-key="view=nested-view-collection-item&id=C"]')).to.be.equal(this.oldChilds[1]);
            });

        });

        describe('невалиден второй элемент вложенной коллекции ->', function() {

            beforeEach(function() {
                ns.Model.get('outer-collection-model').set('.foo', 'bar');
                ns.Model.get('nested-model', {id: 'C'}).set('.foo', 'bar');

                this.findChilds = function() {
                    return [
                        this.APP.node.querySelector('[data-key="view=nested-view-collection-item&id=B"]'),
                        this.APP.node.querySelector('[data-key="view=nested-view-collection-item&id=C"]')
                    ];
                };

                this.oldChilds = this.findChilds();

                var layout = ns.layout.page('app-3');
                return new ns.Update(this.APP, layout, {}).render();
            });

            it('вложенная коллекция должна иметь два элемента', function() {
                expect(this.APP.node.querySelectorAll('[data-key="view=nested-view-collection-item&id=B"]'), 'nested-view-collection-item&id=B').to.have.length(1);
                expect(this.APP.node.querySelectorAll('[data-key="view=nested-view-collection-item&id=C"]'), 'nested-view-collection-item&id=C').to.have.length(1);
            });

            it('вложенная коллекция должна сохранить первый элемент', function() {
                expect(this.APP.node.querySelector('[data-key="view=nested-view-collection-item&id=B"]')).to.be.equal(this.oldChilds[0]);
            });

            it('вложенная коллекция должна перерисовать второй элемент', function() {
                var newNode = this.APP.node.querySelector('[data-key="view=nested-view-collection-item&id=C"]').getAttribute('data-random');
                var oldNode = this.oldChilds[1].getAttribute('data-random');
                expect(newNode).to.not.be.equal(oldNode);

            });
        });

    });

    describe('Обновление внешней коллекции работает корректно, если внутренняя не изменилсь', function() {

        // это тест, чтобы исправить JS-ошибку
        // теперь должен кидаться варнинг, а вложенная коллекция инвалидироваться

        beforeEach(function() {

            ns.Model.define('parent-mc', {isCollection: true});
            ns.Model.define('parent-mc-item', { params: {pid: null} });

            ns.Model.define('child-mc', {
                isCollection: true,
                split: {
                    items: '.items',
                    model_id: 'child-mc-item',
                    params: {
                        cid: '.cid'
                    }
                }
            });
            ns.Model.define('child-mc-item', { params: {cid: null} });

            ns.ViewCollection.define('parent-vc', {
                models: [ 'parent-mc' ],
                split: {
                    byModel: 'parent-mc',
                    intoViews: 'child-vc'
                }
            });
            ns.ViewCollection.define('child-vc', {
                models: [ 'parent-mc-item', 'child-mc' ],
                split: {
                    byModel: 'child-mc',
                    intoViews: 'child-vc-item'
                }
            });
            ns.View.define('child-vc-item', {
                models: ['child-mc-item']
            });

            ns.View.define('app');

            ns.layout.define('test', {
                'app': {
                    'parent-vc': {}
                }
            });


            ns.Model.get('parent-mc').insert([
                ns.Model.get('parent-mc-item', {pid: 1}).setData({pid: 1, val: 1})
            ]);

            ns.Model.get('child-mc', {pid: 1}).insert([
                ns.Model.get('child-mc-item', {cid: 1}).setData({cid: 1, val: 1})
            ]);

            this.sinon.stub(ns.log, 'debug');

            this.view = ns.View.create('app');
            var layout = ns.layout.page('test');

            ns.test.modelsValidAutorespondByMock(this.sinon, {
                '/models/?_m=child-mc': {
                    models: [
                        {
                            data: {
                                items: [
                                    {cid: 3, val: 3}
                                ]
                            }
                        }
                    ]

                }
            });

            return new ns.Update(this.view, layout, {})
                .render()
                .then(function() {
                    ns.Model.get('child-mc', {pid: 1}).invalidate();
                    return new ns.Update(this.view, layout, {}).render();
                }, null, this);
        });

        it('должен перезапросить модель вложенной коллекции', function() {
            expect(this.sinon.server.requests[0].url).to.be.equal('/models/?_m=child-mc');
        });

        it('должен нарисовать один элемент коллекции', function() {
            var childVC = this.view.node.getElementsByClassName('ns-view-child-vc')[0];
            var childVCContainer = childVC.getElementsByClassName('ns-view-container-desc')[0];
            expect(childVCContainer.childNodes).to.have.length(1);
        });

        it('должен удалить старый элемент и заменить его на новый', function() {
            var childVC = this.view.node.getElementsByClassName('ns-view-child-vc')[0];
            var childVCContainer = childVC.getElementsByClassName('ns-view-container-desc')[0];
            expect(childVCContainer.childNodes[0].getAttribute('data-key')).to.be.equal('view=child-vc-item&cid=3');
        });

        /*
        Старое поведение, когда мы не ходили внутрить коллекции
        it('должен удалить элемент вложенной коллекции', function() {
            var childVC = this.view.node.getElementsByClassName('ns-view-child-vc')[0];
            var childVCContainer = childVC.getElementsByClassName('ns-view-container-desc')[0];
            expect(childVCContainer.childNodes).to.have.length(0);
        });
        */

    });

    describe('ViewCollection.isModelsValid', function() {

        describe('ViewCollection with one ns.ModelCollection and one ns.Model', function() {
            beforeEach(function() {

                ns.Model.define('model-collection', {
                    isCollection: true
                });

                ns.Model.define('model');
                ns.Model.define('model-item');


                ns.View.define('view');
                ns.ViewCollection.define('view-collection', {
                    models: ['model-collection', 'model'],
                    split: {
                        byModel: 'model-collection',
                        intoViews: 'view'
                    }
                });

                ns.Model.get('model-collection').insert([
                    ns.Model.get('model-item').setData({ foo: 1})
                ]);
                ns.Model.get('model').setData({ foo: 1});

                ns.layout.define('app', {
                    'view-collection': {}
                });

                this.viewCollection = ns.View.create('view-collection');

                var layout = ns.layout.page('app', {});
                new ns.Update(this.viewCollection, ns.layout.page('app', {}), {}).start();

            });

            it('view should have valid models', function() {
                expect(
                    this.viewCollection.isModelsValidWithVersions()
                ).to.be.equal(true);
            });

            it('view should be invalid after touch single model', function() {
                this.viewCollection.models.model.set('.foo', 2);

                expect(this.viewCollection.isValid()).to.equal(false);
            });
        });
    });

    describe('асинхронная коллекция', function() {

        beforeEach(function() {

            this.sinon.server.autoRespond = true;
            this.sinon.server.respond(function(xhr) {
                xhr.respond(
                    200,
                    {"Content-Type": "application/json"},
                    JSON.stringify({
                        models: [
                            {
                                data: {
                                    items: [
                                        {id: '1', val: 1},
                                        {id: '2', val: 2},
                                        {id: '3', val: 3}
                                    ]
                                }
                            }
                        ]
                    })
                );
            });

            ns.layout.define('app', {
                'app': {
                    'vc&': {}
                }
            });

            ns.Model.define('mc', {
                split: {
                    model_id: 'mc-item',
                    items: '.items',
                    params: {
                        id: '.id'
                    }
                }
            });
            ns.Model.define('mc-item', {
                params: {
                    id: null
                }
            });

            ns.View.define('app');
            ns.ViewCollection.define('vc', {
                models: ['mc'],
                split: {
                    byModel: 'mc',
                    intoViews: 'vc-item'
                }
            });

            ns.View.define('vc-item', {
                models: ['mc-item']
            });


            this.view = ns.View.create('app');
            var layout = ns.layout.page('app');

            return new ns.Update(this.view, layout, {})
                .render()
                .then(function(result) {
                    this.result = result;
                }, this);
        });

        it('коллекция должна отрисоваться в async-режиме', function() {
            expect(this.view.node.querySelectorAll('.ns-view-vc.ns-async')).to.have.length(1);
        });

        describe('перерисовка после получения моделей', function() {

            beforeEach(function() {
                return Vow.all(this.result.async);
            });

            it('коллекция должна отрисоваться в обычном режиме', function() {
                expect(this.view.node.querySelectorAll('.ns-view-vc.ns-view-visible')).to.have.length(1);
            });

            it('коллекция должна отрисовать свои элементы', function() {
                expect(this.view.node.querySelectorAll('.ns-view-vc-item')).to.have.length(3);
            });

        });


    });
});
