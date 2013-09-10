describe('Combinations of entities', function() {

    describe('Update of ns.Box`s parent and child at the same time', function() {
        beforeEach(function(done) {

            // layout
            ns.layout.define('app', {
                'app': {
                    'vParent': {
                        'box@': {
                            'vChild': true
                        }
                    }
                }
            });

            // define models
            ns.Model.define('mParent', {});

            ns.Model.define('mChild', {
                params: {
                    p: null
                }
            });

            // set models data
            ns.Model.get('mParent', {}).setData({'foo': 'bar'});

            ns.Model.get('mChild', {p: 1}).setData({'foo': 'bar'});
            ns.Model.get('mChild', {p: 2}).setData({'foo': 'bar2'});

            // define views
            ns.View.define('app');

            ns.View.define('vParent', {
                models: ['mParent']
            });

            ns.View.define('vChild', {
                models: ['mChild']
            });

            var APP = this.APP = ns.View.create('app');

            // update 1
            new ns.Update(
                this.APP,
                ns.layout.page('app', {p: 1}),
                {p: 1}
            ).start().done(function() {

                ns.Model.get('mParent', {}).set('.foo', 'bar2');
                // update 2
                new ns.Update(
                    APP,
                    ns.layout.page('app', {p: 2}),
                    {p: 2}
                ).start()
                    .always(function() {
                        done();
                    });
            });
            
        });

        afterEach(function() {
            delete this.APP;
        });

        it('should have 1 visible node for view vChild', function() {
            expect(this.APP.node.querySelectorAll('.ns-view-vChild.ns-view-visible').length).to.be(1);
        });

    });
});