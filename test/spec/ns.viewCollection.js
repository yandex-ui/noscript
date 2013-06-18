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

});
