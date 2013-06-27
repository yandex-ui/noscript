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

            this.model = ns.Model.create('m-collection');
            // insert first item
            this.model.setData([
                ns.Model.create('m-collection-item', {p: 1}, {data: 1})
            ]);

            ns.Model.define('wrap-model');
            ns.Model.create('wrap-model', {}, {data: true});

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
                    ns.Model.create('wrap-model').set('.fake', 1);

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

    describe('redraw on ModelCollection changes', function() {

        describe('insert new model-item', function() {

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

                this.model = ns.Model.create('m-collection');
                // insert first item
                this.model.setData([
                    ns.Model.create('m-collection-item', {p: 1}, {data: 1})
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
                this.APP = ns.View.create('app');

                // define layout
                ns.layout.define('app', {
                    'app': {
                        'v-collection': {}
                    }
                });

                // first rewdraw
                var layout = ns.layout.page('app', {});
                new ns.Update(this.APP, layout, {})
                    .start()
                    .done(function() {
                        this.collectionViewNode1 = this.APP.node.getElementsByClassName('ns-view-v-collection')[0];

                        // insert another model-item in collection
                        this.model.insert([ns.Model.create('m-collection-item', {p: 2})]);

                        // start update to redraw views
                        var layout = ns.layout.page('app', {});
                        new ns.Update(this.APP, layout, {})
                            .start()
                            .done(function() {
                                finish();
                            });
                    }.bind(this));
            });

            afterEach(function() {
                delete this.APP;
                delete this.collectionViewNode1;
                delete this.model;
            });

            it('should create view-collection node', function() {
                expect(this.collectionViewNode1).to.be.an(Node);
            });

            it('view-collection node should be the same after second update', function() {
                expect(this.collectionViewNode1).to.be(
                    this.APP.node.getElementsByClassName('ns-view-v-collection')[0]
                );
            });

            it('should add v-collection-item when I insert model-item in collection', function() {
                expect(this.collectionViewNode1.childNodes).to.have.length(2);
            });

        });

    });

});
