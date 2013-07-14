describe('ns.ViewCollection', function() {

    describe('ns.ViewCollection.define', function() {

        beforeEach(function() {
            sinon.spy(ns.ViewCollection, 'define');

            ns.Model.define('model');
            ns.Model.define('model-collection1', {isCollection: true});
            ns.Model.define('model-collection2', {isCollection: true});
        });

        afterEach(function() {
            ns.ViewCollection.define.restore();
        });

        it('should throw exception if I define viewCollection without models', function() {
            try {
                ns.ViewCollection.define('collection');
            } catch(e) {}

            expect(ns.ViewCollection.define.getCall(0).threw()).to.be.ok();
        });

        it('should throw exception if I define viewCollection without ModelCollection', function() {
            try {
                ns.ViewCollection.define('collection', {
                    models: [ 'model' ]
                });
            } catch(e) {}

            expect(ns.ViewCollection.define.getCall(0).threw()).to.be.ok();
        });

        it('should throw exception if I define viewCollection with several ModelCollections', function() {
            try {
                ns.ViewCollection.define('collection', {
                    models: [ 'model-collection1', 'model-collection2' ]
                });
            } catch(e) {}

            expect(ns.ViewCollection.define.getCall(0).threw()).to.be.ok();
        });

        it('should throw exception if I define viewCollection with single ModelCollection but without split.view_id', function() {
            try {
                ns.ViewCollection.define('collection', {
                    models: [ 'model-collection1' ]
                });
            } catch(e) {}

            expect(ns.ViewCollection.define.getCall(0).threw()).to.be.ok();
        });

        it('should not throw exception if I define viewCollection with single ModelCollection and split.view_id', function() {
            try {
                ns.ViewCollection.define('collection', {
                    models: [ 'model-collection1' ],
                    split: {
                        view_id: 'collection-item'
                    }
                });
            } catch(e) {}

            expect(ns.ViewCollection.define.getCall(0).threw()).to.not.be.ok();
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
            this.model.setData([
                ns.Model.get('m-collection-item', {p: 1}).setData({data: 1})
            ]);

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
                    view_id: 'v-collection-item'
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

        function shouldNotRequestMCollectionTwice() {
            it('should not request m-collection twice', function() {
                expect(
                    ns.request.models.getCall(1).calledWith([])
                ).to.be.ok();
            });
        }

        function shouldSaveVCollectionNode() {
            it('should save view-collection node', function() {
                var newVCollectionNode = this.APP.node.getElementsByClassName('ns-view-v-collection')[0];
                expect(newVCollectionNode).to.be(this.vCollectionNodeList[0])
            });
        }

        function shouldSaveNVCollectionItemNode(n) {
            it('should save view-collection-item[' + n + '] node', function() {
                var newVCollectionItemNode = this.APP.node.getElementsByClassName('ns-view-v-collection-item')[n];
                expect(newVCollectionItemNode).to.be(this.vCollectionItemNodeList[n])
            });
        }

        function shouldHaveNViewColelectionItemNodes(n) {
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
            ns.Model.get('m-collection').setData([
                ns.Model.get('m-collection-item', {p: 1}).setData({data: 1}),
                ns.Model.get('m-collection-item', {p: 2}).setData({data: 2})
            ]);

            // define views
            ns.View.define('app');
            ns.ViewCollection.define('v-collection', {
                models: [ 'm-collection' ],
                split: {
                    view_id: 'v-collection-item'
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

            sinon.spy(ns.request, 'models');

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
            ns.request.models.restore();
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

            shouldHaveNViewColelectionItemNodes(2);

            it('should request m-collection once', function() {
                expect(
                    ns.request.models.calledWith( [ns.Model.get('m-collection')] )
                ).to.be.ok();
            });

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

            shouldNotRequestMCollectionTwice();
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
                    .done(function() {
                        finish();
                    });
            });

            shouldNotRequestMCollectionTwice();
            shouldSaveVCollectionNode();
            shouldHaveNViewColelectionItemNodes(2);

            it('should render new view-collection-item[0] node', function() {
                var newVCollectionItemNode = this.APP.node.getElementsByClassName('ns-view-v-collection-item')[0];
                expect(newVCollectionItemNode).to.not.be(this.vCollectionItemNodeList[0])
            });

            shouldSaveNVCollectionItemNode(1);

        });

        describe('refresh layout after insert new model-item', function() {

            beforeEach(function(finish) {
                // insert another model-item in collection
                ns.Model.get('m-collection').insert([ns.Model.get('m-collection-item', {p: 3})]);

                // start update to redraw views
                var layout = ns.layout.page('app', {});
                new ns.Update(this.APP, layout, {})
                    .start()
                    .done(function() {
                        finish();
                    });
            });

            shouldNotRequestMCollectionTwice();
            shouldHaveNViewColelectionItemNodes(3);
            shouldSaveVCollectionNode();
            shouldSaveNVCollectionItemNode(0);
            shouldSaveNVCollectionItemNode(1);

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

            shouldNotRequestMCollectionTwice();
            shouldHaveNViewColelectionItemNodes(1);
            shouldSaveVCollectionNode();

            it('should save view-collection-item[1] node', function() {
                var newVCollectionItemNode = this.APP.node.getElementsByClassName('ns-view-v-collection-item')[0];
                // we've removed first item, so new item[0] should be the same with old[1]
                expect(newVCollectionItemNode).to.be(this.vCollectionItemNodeList[1])
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
                expect(newVCollectionNode).to.not.be(this.vCollectionNodeList[0])
            });

            shouldSaveNVCollectionItemNode(0);
            shouldSaveNVCollectionItemNode(1);

        });

    });

});
