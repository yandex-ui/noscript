describe('no.Updater', function() {

    describe('.start()', function() {
        beforeEach(function() {
            ns.layout.define('simple', {
                'main': true
            });

            ns.Model.define('model', {
                methods: {
                    canRetry: no.false
                }
            });

            ns.View.define('main', {
                models: ['model']
            });
            var view = ns.View.create('main');

            var layout = ns.layout.page('simple', {});
            this.updater = new ns.Update(view, layout, {});

            this.xhr = sinon.useFakeXMLHttpRequest();
            var requests = this.requests = [];
            this.xhr.onCreate = function (xhr) {
                console.log('add request', xhr);
                requests.push(xhr);
            };
        });

        afterEach(function() {
            ns.clean();

            this.xhr.restore();
            delete this.updater;
        });

        it('should return no.Promise', function() {
            var returnValue = this.updater.start();
            expect(returnValue).to.be.a(no.Promise);
        });

        it('should resolve promise with ns.Updater instance', function(finish) {
            var returnValue = this.updater.start();
            var that = this;
            returnValue.done(function(data) {
                try {
                    expect(data).to.be.eql({
                        instance: that.updater
                    });
                    finish();
                } catch(e) {
                    finish(e);
                }

            });

            this.requests[0].respond(
                200,
                {"Content-Type": "application/json"},
                JSON.stringify({
                    models: [
                        {data: true}
                    ]
                })
            );
        });

        it('should reject promise with ns.Updater instance and status expired', function(finish) {
            this.updater.id = Number.NEGATIVE_INFINITY;
            var returnValue = this.updater.start();
            var that = this;
            returnValue.fail(function(data) {
                try {
                    expect(data).to.be.eql({
                        instance: that.updater,
                        error: ns.U.STATUS.EXPIRED
                    });
                    finish();
                } catch(e) {
                    finish(e);
                }

            });

            this.requests[0].respond(
                200,
                {"Content-Type": "application/json"},
                JSON.stringify({
                    models: [
                        {data: true}
                    ]
                })
            );
        });

        it('should reject promise with ns.Updater instance and status models', function(finish) {
            var returnValue = this.updater.start();
            var that = this;
            returnValue.fail(function(data) {
                try {
                    expect(data).to.be.eql({
                        instance: that.updater,
                        error: ns.U.STATUS.MODELS,
                        models: [ns.Model.get('model')]
                    });
                    finish();
                } catch(e) {
                    finish(e);
                }

            });

            this.requests[0].respond(
                500,
                {"Content-Type": "application/json"},
                JSON.stringify({
                    models: [
                        {data: true}
                    ]
                })
            );
        });
    });

    describe('box inside box', function() {

        beforeEach(function() {
            ns.layout.define('box-inside-box', {
                'main': {
                    'box1@': {
                        'box2@': {}
                    }
                }
            });

            ns.View.define('main');
            var view = ns.View.create('main');

            var layout = ns.layout.page('box-inside-box', {});
            var updater = new ns.Update(view, layout, {});
            updater.start();
        });

        afterEach(function() {
            ns.layout.undefine();
            ns.View.undefine();
        });

        it('check arg to ns.tmpl', function() {
            var renderJSON = {
                'location': window.location,
                'layout-params': {},
                'views': {
                    'main': {
                        'async': false,
                        'models': {},
                        'page': undefined,
                        'params': {},
                        'tree': {
                            'main': true
                        },
                        'views': {
                            'box1': {
                                'box': true,
                                'tree': {
                                    'box1': true
                                },
                                'views': {
                                    'box2': {
                                        'box': true,
                                        'tree': {
                                            'box2': true
                                        },
                                        'views': {}
                                    }
                                }
                            }
                        }
                    }
                }
            };
            expect(ns.tmpl.calledWithMatch(renderJSON)).to.be.ok();
        });
    });

    describe('_getRequestViews', function() {
        //sync, async, models
    });

    describe('_getUpdateTree', function() {
        //sync, async, tree structure, add models to structure
        //empty tree
    });

});
