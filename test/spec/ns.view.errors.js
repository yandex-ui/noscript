describe('ns.View error handling', function() {
    describe('ns.Update.handleError', function() {

        beforeEach(function() {
            ns.Model.define('letter', { params: { id: null } });

            ns.View.define('app');
            ns.View.define('letter', { models: [ 'letter' ] });

            ns.layout.define('app', {
                'app': 'letter'
            });

            this.APP = ns.View.create('app');
            this.update = new ns.Update(
                this.APP,
                ns.layout.page('app', {}),
                {}
            );

            // Fake http server.
            this.server = sinon.fakeServer.create();
            this.server.autoRespond = true;
            this.server.respondWith(/.*/, function(xhr) {
                xhr.respond(
                    200,
                    { "Content-Type": "application/json" },
                    JSON.stringify({ models: [ { error: 'letter not found' } ] })
                );
            });
        });

        afterEach(function() {
            delete this.APP;
            delete this.update;
        });

        it('render .ns-view-error-content template', function(finish) {
            var that = this;
            var update = this.update;
            ns.Update.handleError = function(_error, _update) {
                expect(_update).to.be.equal(update);
                expect(_error.error).to.be.equal('models');
                return true;
            };
            this.update.start().then(function() {
                expect($('.ns-view-letter', that.APP.node).html()).to.be.equal('view-error-content');
                finish();
            });
        });

        it('pass error objects while rendering html', function(finish) {
            ns.Update.handleError = function() {
                return true;
            };
            this.update.start().then(function() {
                var renderJSON = {
                    'views': {
                        'app': {
                            'state': 'ok',
                            'models': {},
                            'views': {
                                'letter': {
                                    'state': 'error',
                                    'models': {
                                        'letter': {
                                            'status': 'error',
                                            'data': 'letter not found'
                                        }
                                    }
                                }
                            }
                        }
                    }
                };
                expect(ns.renderString.calledWithMatch(renderJSON)).to.be.equal(true);
                finish();
            });
        });

        it('if ns.Update.handleError() returns `false` update is rejected', function(finish) {
            ns.Update.handleError = function() {
                return false;
            };
            this.update.start().fail(function() {
                finish();
            });
        });
    });

    describe('async view is redrawn in case of model with error for sync view is handled by ns.Update.handleError', function() {
        var setupServerResponses = function(that, modelResponses) {
            var responses = {};
            for (var model_id in modelResponses) {
                responses['/models/?_m=' + model_id] = JSON.stringify(modelResponses[model_id]);
            }

            var server = that.server = sinon.fakeServer.create();
            server.autoRespond = true;
            server.respondWith(function(xhr) {
                var response = responses[xhr.url];
                if (!response) {
                    throw new Error('Response not specified for  ' + xhr.url);
                }
                xhr.respond(200, { "Content-Type": "application/json" }, responses[xhr.url]);
            });
        };

        beforeEach(function(done) {
            ns.layout.define('app', {
                'app': {
                    'content@': {
                        'main-content': true,
                        'right-panel': {
                            'profile': {
                                'news-box@': {
                                    'news&': true
                                }
                            }
                        }
                    }
                }
            });

            this.sinon.stub(ns.Update, 'handleError', function() {
                return true;
            });

            ns.View.define('app');
            ns.View.define('main-content', { models: [ 'user' ] }); // this will be sync view and this user model will fail
            ns.View.define('right-panel');
            ns.View.define('profile');
            ns.View.define('news', { models: [ 'news' ] }); // this will be an async view and it will succeed.

            ns.Model.define('user');
            ns.Model.define('news');

            setupServerResponses(this, {
                'user': { models: [ { error: { name: 'user not found' } } ] },
                'news': { models: [ { data: 'These are latest news' } ] }
            });

            var params = {};
            var app = this.appView = ns.View.create('app');
            var layout = ns.layout.page('app', params);
            var promise = new ns.Update(app, layout, params).start();

            promise
                .then(function(details) {
                    Vow.all(details.async).always(function() {
                        done();
                    });
                });
        });

        it('async view should have status ok', function() {
            var app = this.appView;
            var news = app
                .views['content']
                .views['view=right-panel']
                .views['profile']
                .views['news-box']
                .views['view=news'];

            expect(news.status).to.be.eql(ns.V.STATUS.OK);
        });
    });
});
