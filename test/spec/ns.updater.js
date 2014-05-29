describe('no.Updater', function() {

    describe('#perf()', function() {

        beforeEach(function(done) {

            this.sinon.spy(ns.Update.prototype, 'perf');

            ns.layout.define('app', {
                'app': true
            });

            ns.Model.define('photo');
            ns.View.define('app', { models: ['photo'] });

            this.sinon.server.autoRespond = true;
            this.sinon.server.respondWith(function(xhr) {
                xhr.respond(200, { "Content-Type": "application/json" }, '{ "models": [ { "data": {} } ] }');
            });

            this.view = ns.View.create('app');
            var layout = ns.layout.page('app', {});
            new ns.Update(this.view, layout, {})
                .start()
                .then(function() {
                    done();
                }, function(e) {
                    done(e || 'failed')
                });
        });

        it('должен вызваться perf после завершения обновления', function() {
            expect(ns.Update.prototype.perf).to.have.been.calledOnce;
        });

        it('должен вызваться perf c правильными данными после завершения обновления', function() {
            var arg = ns.Update.prototype.perf.getCall(0).args[0];
            expect(arg).to.have.property('prepare').that.is.at.least(0);
            expect(arg).to.have.property('request').that.is.at.least(0);
            expect(arg).to.have.property('tree').that.is.at.least(0);
            expect(arg).to.have.property('template').that.is.at.least(0);
            expect(arg).to.have.property('dom').that.is.at.least(0);
            expect(arg).to.have.property('events').that.is.at.least(0);
        });

    });

    describe('concurent ns.Update instances', function() {

        describe('2 concurent global ns.Update', function() {

            beforeEach(function() {
                ns.layout.define('page', {
                    app: {
                        my_view: true
                    }
                });

                ns.Model.define('my_model');

                ns.View.define('app', {
                    models: ['my_model']
                });
                ns.View.define('my_view');

                this.view = ns.View.create('app');

                var layout = ns.layout.page('page', {});
                this.updater1 = new ns.Update(this.view, layout, {});
                this.updater2 = new ns.Update(this.view, layout, {});
            });

            afterEach(function() {
                delete this.updater1;
                delete this.updater2;
                delete this.view;
            });

            it('should reject old ns.Update if new one is running', function(finish) {
                this.updater1.start()
                    .then(function() {
                        finish('first ns.Update was resolved');
                    }, function(result) {
                        try {
                            expect(result.error).to.be.equal(ns.U.STATUS.EXPIRED);
                            finish();
                        } catch(e) {
                            finish(e);
                        }
                    });

                this.updater2.start();

                this.sinon.server.requests[0].respond(
                    200,
                    {"Content-Type": "application/json"},
                    JSON.stringify({
                        models: [
                            {data: true}
                        ]
                    })
                );
            });

            it('should resolve new ns.Update', function(finish) {
                this.updater1.start();

                this.updater2.start()
                    .then(function() {
                        finish();
                    }, function() {
                        finish('second ns.Update was rejected');
                    });

                this.sinon.server.requests[0].respond(
                    200,
                    {"Content-Type": "application/json"},
                    JSON.stringify({
                        models: [
                            {data: true}
                        ]
                    })
                );
            });
        });

        describe('2 concurent async ns.Update', function() {

            beforeEach(function() {
                ns.layout.define('page', {
                    app: {
                        'my_view1&': true,
                        'my_view2&': true
                    }
                });

                ns.Model.define('my_model1');
                ns.Model.define('my_model2');

                ns.View.define('app');
                ns.View.define('my_view1', {
                    models: ['my_model1']
                });
                ns.View.define('my_view2', {
                    models: ['my_model2']
                });

                this.view = ns.View.create('app');

                var layout = ns.layout.page('page', {});
                this.promise = new ns.Update(this.view, layout, {}).start();
            });

            afterEach(function() {
                delete this.promise;
                delete this.view;
            });

            it('should resolve first async promise', function(finish) {
                this.promise.then(function(result) {
                    result.async[0]
                        .then(function() {
                            finish();
                        }, function() {
                            finish('First async promise was rejected');
                        });

                    this.sinon.server.requests[0].respond(
                        200,
                        {"Content-Type": "application/json"},
                        JSON.stringify({
                            models: [
                                {data: true}
                            ]
                        })
                    );
                    this.sinon.server.requests[1].respond(
                        200,
                        {"Content-Type": "application/json"},
                        JSON.stringify({
                            models: [
                                {data: true}
                            ]
                        })
                    );
                }.bind(this));
            });

            it('should resolve second async promise', function(finish) {
                this.promise.done(function(result) {
                    result.async[1]
                        .then(function() {
                            finish();
                        }, function() {
                            finish('Second async promise was rejected');
                        });

                    this.sinon.server.requests[0].respond(
                        200,
                        {"Content-Type": "application/json"},
                        JSON.stringify({
                            models: [
                                {data: true}
                            ]
                        })
                    );
                    this.sinon.server.requests[1].respond(
                        200,
                        {"Content-Type": "application/json"},
                        JSON.stringify({
                            models: [
                                {data: true}
                            ]
                        })
                    );
                }.bind(this));
            });

        });

        describe('update+async update', function() {

            beforeEach(function(finish) {
                ns.layout.define('page1', {
                    app: {
                        'box@': {
                            'my_view1&': true
                        }
                    }
                });

                ns.layout.define('page2', {
                    app: {
                        'box@': {
                            'my_view2': true
                        }
                    }
                });

                ns.router.routes = {
                    'route': {
                        '/page1': 'page1',
                        '/page2': 'page2'
                    }
                };
                ns.router.init();

                ns.Model.define('my_model1');
                ns.Model.define('my_model2');

                ns.Model.get('my_model2').setData({data: true});

                ns.View.define('app');
                ns.View.define('my_view1', {
                    models: ['my_model1']
                });
                ns.View.define('my_view2', {
                    models: ['my_model2']
                });

                var that = this;
                ns.MAIN_VIEW = ns.View.create('app');

                ns.page.go('/page1')
                    .then(function() {

                        // don't wait for async view
                        // start new global update

                        ns.page.go('/page2')
                            .done(function() {

                                // get response for async-view
                                that.sinon.server.requests[0].respond(
                                    200,
                                    {"Content-Type": "application/json"},
                                    JSON.stringify({
                                        models: [
                                            {data: true}
                                        ]
                                    })
                                );

                                window.setTimeout(function() {
                                    finish();
                                }, 100);

                            })
                            .fail(function() {
                                finish('ns.Update fails');
                            });

                    }, function() {
                        finish('ns.Update fails');
                    });
            });

            afterEach(function() {
                delete this.promise;
            });

            it('should save state for page2', function() {
                expect(ns.MAIN_VIEW.$node.find('.ns-view-my_view2').hasClass('ns-view-visible')).to.be.equal(true);
            });

        });
    });

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
        });

        afterEach(function() {
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

            it('should return promise', function() {
                var returnValue = this.updater.start();
                expect(Vow.isPromise(returnValue)).to.be.equal(true);
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
                returnValue.then(function() {
                    finish();
                });

                this.sinon.server.requests[0].respond(
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
                            invalidModels: [ns.Model.get('model')],
                            validModels: []
                        });
                        finish();
                    } catch(e) {
                        finish(e);
                    }

                });

                this.sinon.server.requests[0].respond(
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
                returnValue.then(function(data) {
                    try {
                        expect(data.async).to.be.a('array');
                        finish();
                    } catch(e) {
                        finish(e);
                    }

                });
            });

            it('should resolve promise with new ns.Update instance when async view is finished', function(finish) {
                var returnValue = this.updater.start();
                returnValue.then(function(data) {
                    data.async[0].then(function(result) {
                        try {
                            expect(result.async).to.have.length(0);
                            finish();
                        } catch(e) {
                            finish(e);
                        }
                    });
                });

                this.sinon.server.requests[0].respond(
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
                returnValue.then(function(data) {
                    data.async[0].fail(function(result) {
                        try {
                            expect(result).to.have.property('error', ns.U.STATUS.MODELS);
                            expect(result.invalidModels).to.be.eql([ns.Model.get('model')]);
                            finish();
                        } catch(e) {
                            finish(e);
                        }
                    });
                });

                this.sinon.server.requests[0].respond(
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
    });

    describe('box inside box', function() {

        beforeEach(function(finish) {
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
            updater.start().then(function() {
                finish();
            });
        });

        it('check arg to ns.tmpl', function() {
            var renderJSON = {
                'views': {
                    'main': {
                        'async': false,
                        'models': {},
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
            expect(ns.tmpl.calledWithMatch(renderJSON)).to.be.equal(true);
        });
    });

    describe('update of two async views', function() {

        beforeEach(function() {

            ns.layout.define('app', {
                'app': {
                    'content@': {
                        'photo': {
                            'photo-left@': {
                                'photo-image&': true
                            },
                            'bottom-left@': {
                                'photo-below': {
                                    'comments@': {
                                        'photo-comments&': true
                                    }
                                }
                            }
                        }
                    }
                }
            });

            /// Models
            ns.Model.define('photo');
            ns.Model.define('comments');

            /// Views
            ns.View.define('app');
            ns.View.define('photo', { models: [] });
            ns.View.define('photo-image', { models: [ 'photo' ] });
            ns.View.define('photo-below', { models: [ 'photo' ] });
            ns.View.define('photo-comments', { models: [ 'comments' ] });

            var server_mock_data = {
                '/models/?_m=photo': '{ "models": [ { "data": {} } ] }',
                '/models/?_m=comments': '{ "models": [ { "data": {} } ] }'
            };

            var server = this.server = sinon.fakeServer.create();
            server.autoRespond = true;

            server.respondWith(function(xhr) {
                var response = server_mock_data[xhr.url];
                if (response) {
                    xhr.respond(200, { "Content-Type": "application/json" }, response);
                } else {
                    xhr.respond(400);
                }
            });

            this.view = ns.View.create('app');
            var layout = ns.layout.page('app', {});
            var updater = new ns.Update(this.view, layout, {});
            this.promise = updater.start();
        });

        afterEach(function() {
            delete this.promise;
        });

        it('should replace all async nodes', function(finish) {
            var that = this;
            this.promise
                .then(function(result) {
                    Vow.all(result.async)
                        .done(function() {
                            try {
                                expect($(that.view.node).find('.ns-async')).to.have.length(0);
                                finish();
                            } catch(e) {
                                finish(e);
                            }
                        })
                        .fail(function() {
                            finish('async ns.Update was rejected');
                        });
                }, function() {
                    finish('main ns.Update was rejected');
                });
        });
    });

    describe('interrupting updates of async views inside a box', function() {
        beforeEach(function(finish) {
            ns.layout.define('app', {
                'app': {
                    'box@': 'todos&'
                }
            });

            /// Model
            ns.Model.define('todos', { params: { category: null } });

            /// Views
            ns.View.define('app');
            ns.View.define('todos', { models: [ 'todos' ] });

            ns.router.routes = {
                route: {
                    '/{category:int}': 'app'
                }
            };
            ns.router.init();

            var server = this.server = sinon.fakeServer.create();
            server.autoRespond = true;
            server.autoRespondAfter = 400;
            server.respondWith('{ "models": [ { "data": {} } ] }');

            ns.MAIN_VIEW = ns.View.create('app');

            ns.page.go('/1').then(function() {
                ns.page.go('/2').then(function(result) {
                    Vow.all(result.async)
                        .then(function() {
                            ns.page.go('/2').then(function() {
                                finish();
                            }.bind(this));
                        }.bind(this));
                }.bind(this));
            }.bind(this));

        });

        it('should hide async views', function() {
            expect(ns.MAIN_VIEW.node.querySelectorAll('.ns-async:not(.ns-view-hidden)')).to.have.length(0);
        });

        it('should show only one view', function() {
            expect(ns.MAIN_VIEW.node.querySelectorAll('.ns-view-todos.ns-view-visible')).to.have.length(1);
        });

        it('should hide other fetching views', function() {
            expect(ns.MAIN_VIEW.node.querySelectorAll('.ns-view-todos.ns-view-hidden')).to.have.length(1);
        });
    });

    describe('interrupting updates of async views inside a box - 2', function() {

        beforeEach(function(finish) {
            ns.layout.define('app', {
                'app': {
                    'box@': 'todos&'
                }
            });

            /// Model
            ns.Model.define('todos', { params: { category: null } });

            /// Views
            ns.View.define('app');
            ns.View.define('todos', { models: [ 'todos' ] });

            ns.router.routes = {
                route: {
                    '/{category:int}': 'app'
                }
            };
            ns.router.init();

            var server = this.server = sinon.fakeServer.create();
            server.autoRespond = true;
            server.respondWith('{ "models": [ { "data": {} } ] }');

            ns.MAIN_VIEW = ns.View.create('app');

            // Run two interrupting updates.
            ns.page.go('/1').then(function() {
                ns.page.go('/2').then(function(result) {
                    Vow.all(result.async)
                        .then(function() {
                            finish();
                        }.bind(this));
                }.bind(this));
            }.bind(this));
        });

        it('should hide async views', function() {
            expect(ns.MAIN_VIEW.node.querySelectorAll('.ns-async:not(.ns-view-hidden)')).to.have.length(0);
        });

        it('should show only one view', function() {
            expect(ns.MAIN_VIEW.node.querySelectorAll('.ns-view-todos.ns-view-visible')).to.have.length(1);
        });

        it('should hide other fetching views', function() {
            expect(ns.MAIN_VIEW.node.querySelectorAll('.ns-view-todos.ns-view-hidden')).to.have.length(1);
        });

        it('should correctly switch views once navigated back', function(finish) {
            ns.page.go('/1').then(function() {
                expect(ns.MAIN_VIEW.node.querySelector('.ns-view-todos.ns-view-visible').getAttribute('data-key')).to.contain('category=1');
                expect(ns.MAIN_VIEW.node.querySelector('.ns-view-todos.ns-view-hidden').getAttribute('data-key')).to.contain('category=2');
                finish();
            });
        });
    });

    describe('Состояние async-view определяется один раз за update и не пересчитывается динамически', function() {

        // Это синтетический тест и на данный момент такого в реальности быть не может

        // Cейчас работоспособность этого случая обеспечивается исключительно синхронностью вызова методов
        // ns.View#_getUpdateTree() -> ns.Update#render() -> ns.View._updateHTML() в ns.Update#_update()
        // Т.е. заменив какую-то часть на асинхронную, мы напоримсся на странный баг,
        // когда вроде бы асинхронный вид отрисовал ns-view-async-content и так в нем и остался

        // Баг заключается в том, что в ns.View._updateHTML() состояние async определеяется не по ранее рассчитанному флагу,
        // которое попало в дерево отрисовки, а заново на основе isModelsValid()
        // 1 - это в корне неверно, потому что состояние должно определяться из того, что отрисовали
        // 2 - это лишние вызовы


        beforeEach(function(done) {
            this.htmlinitSpy = this.sinon.spy();
            this.asyncSpy = this.sinon.spy();

            ns.layout.define('app', {
                'app': {
                    'async&': true
                }
            });

            ns.Model.define('model-async');

            /// Views
            ns.View.define('app');
            ns.View.define('async', {
                events: {
                    'ns-view-async': this.asyncSpy,
                    'ns-view-htmlinit': this.htmlinitSpy
                },
                models: ['model-async']
            });

            ns.Update.prototype._render = ns.Update.prototype.render;
            this.sinon.stub(ns.Update.prototype, 'render', function() {
                ns.Model.get('model-async').setData({});
                return this._render.apply(this, arguments);
            });

            var view = ns.View.create('app');
            var layout = ns.layout.page('app', {});
            new ns.Update(view, layout, {})
                .start()
                .then(function() {
                    done();
                });
        });

        it('не должно быть события ns-view-htmlinit', function() {
            expect(this.htmlinitSpy).to.not.be.called;
        });

        it('должно быть событиt ns-view-async', function() {
            expect(this.asyncSpy).to.be.calledOnce;
        });

    });
});
