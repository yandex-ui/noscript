describe('no.Updater', function() {

    describe('.start()', function() {

        beforeEach(function() {

            ns.Model.define('model', {
                methods: {
                    canRetry: no.false
                }
            });

            ns.View.define('main', {
                models: ['model']
            });

            this.view = ns.View.create('main');

            this.xhr = sinon.useFakeXMLHttpRequest();
            var requests = this.requests = [];
            this.xhr.onCreate = function (xhr) {
                requests.push(xhr);
            };
        });

        afterEach(function() {
            ns.clean();

            this.xhr.restore();
            delete this.updater;
            delete this.view;
        });

        describe('interface', function() {

            beforeEach(function() {
                ns.layout.define('simple', {
                    'main': true
                });

                var layout = ns.layout.page('simple', {});
                this.updater = new ns.Update(this.view, layout, {});
            });

            it('should return no.Promise', function() {
                var returnValue = this.updater.start();
                expect(returnValue).to.be.a(no.Promise);
            });
        });

        describe('sync views: return values from promise', function() {

            beforeEach(function() {
                ns.layout.define('simple', {
                    'main': true
                });

                var layout = ns.layout.page('simple', {});
                this.updater = new ns.Update(this.view, layout, {});
            });

            it('should resolve promise', function(finish) {
                var returnValue = this.updater.start();
                returnValue.done(function() {
                    finish();
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

            it('should reject promise with status EXPIRED when new ns.Update is running', function(finish) {
                this.updater.id = Number.NEGATIVE_INFINITY;
                var returnValue = this.updater.start();
                returnValue.fail(function(data) {
                    try {
                        expect(data).to.be.eql({
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

            it('should reject promise with status MODELS when ns.request is failed', function(finish) {
                var returnValue = this.updater.start();
                returnValue.fail(function(data) {
                    try {
                        expect(data).to.be.eql({
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

        describe('async views: return values from promise', function() {

            beforeEach(function() {
                ns.layout.define('simple-async', {
                    'app': {
                        'main&': true
                    }
                });

                ns.View.define('app');
                var view = ns.View.create('app');

                var layout = ns.layout.page('simple-async', {});
                this.updater = new ns.Update(view, layout, {});
            });

            it('should return promises for async ns.Update', function(finish) {
                var returnValue = this.updater.start();
                returnValue.done(function(data) {
                    try {
                        expect(data.async).to.be.a(Array);
                        finish();
                    } catch(e) {
                        finish(e);
                    }

                });
            });

            it('should resolve promise with new ns.Update instance when async view is finished', function(finish) {
                var returnValue = this.updater.start();
                returnValue.done(function(data) {
                    data.async[0].done(function(result) {
                        try {
                            expect(result.async).to.have.length(0);
                            finish();
                        } catch(e) {
                            finish(e);
                        }
                    });
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

            it('should reject promise with status MODELS when ns.request is failed', function(finish) {
                var returnValue = this.updater.start();
                returnValue.done(function(data) {
                    data.async[0].fail(function(result) {
                        try {
                            expect(result).to.have.property('error', ns.U.STATUS.MODELS);
                            expect(result.models).to.be.eql([ns.Model.get('model')]);
                            finish();
                        } catch(e) {
                            finish(e);
                        }
                    });
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

            it('should reject promise with status EXPIRED when new ns.Update is running', function(finish) {
                var returnValue = this.updater.start();
                var that = this;
                returnValue.done(function(data) {
                    that.updater.id = Number.NEGATIVE_INFINITY;
                    that.requests[0].respond(
                        200,
                        {"Content-Type": "application/json"},
                        JSON.stringify({
                            models: [
                                {data: true}
                            ]
                        })
                    );

                    data.async[0].fail(function(result) {
                        try {
                            expect(result).to.have.property('error', ns.U.STATUS.EXPIRED);
                            finish();
                        } catch(e) {
                            finish(e);
                        }
                    });
                });
            })

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

});
