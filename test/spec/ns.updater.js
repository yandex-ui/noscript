describe('ns.Updater', function() {

    var createTestApp = function() {
        ns.layout.define('asyncLayout', {
            'app': {
                'vSync0':   ['vSync1', 'vSync2'],
                'vAsync1&': ['vSync3', 'vSync4'],
                'vAsync2&': true
            }
        });

        ns.layout.define('syncLayout', {
            'app': {
                'vSync0': ['vSync1', 'vSync2'],
                'vSync3': {},
                'vSync4': {},
                'vCollection': true
            }
        });

        ns.Model.define('mItem', {params: {id: null}});
        ns.Model.define('mCollection', {
            split: {
                items: '.items',
                model_id: 'mItem',
                params: {
                    id: '.id'
                }
            }
        });

        ns.Model.define('mSync1'); ns.Model.define('mSync2'); ns.Model.define('mSync3');
        ns.Model.define('mAsync1'); ns.Model.define('mAsync2');

        ns.View.define('app');
        this.view = ns.View.create('app');

        ns.View.define('vSync0', {models: ['mSync1']});
        ns.View.define('vSync1');
        ns.View.define('vSync2', {models: ['mSync2']});
        ns.View.define('vSync3', {models: ['mSync3']});
        ns.View.define('vSync4');

        ns.View.define('vAsync1', {models: ['mAsync1']});
        ns.View.define('vAsync2', {models: ['mAsync2']});

        ns.View.define('vItem', {models: ['mItem']});
        ns.ViewCollection.define('vCollection', {
            models: ['mCollection'],
            split: {
                byModel: 'mCollection',
                intoViews: 'vItem'
            }
        });

        this.response0 = {
            "models": [
                {"data": {"sync1": true}},
                {"data": {"sync2": true}},
                {"data": {"sync3": true}},
                {"data": {"items": [{id: 1}, {id: 2}, {id: 3}]}}
            ]
        };

        this.response1 = {
            "models": [
                {"data": {"async1": true}}
            ]
        };

        this.response2 = {
            "models": [
                {"data": {"async2": true}}
            ]
        };
    };

    describe('scenario', function() {
        beforeEach(function() {
            this.createTestApp = createTestApp;
            this.createTestApp();

            this.sinon.spy(ns.Update.prototype, 'perf');
        });

        afterEach(function() {
            delete this.view;
        });

        describe('prefetch', function() {
            beforeEach(function(done) {
                this.update = new ns.Update(this.view, ns.layout.page('asyncLayout', {}), {});
                this.update.prefetch().then(function() {
                    done();
                });
                this.sinon.server.requests[0].respond(200, {"Content-Type": "application/json"}, JSON.stringify(this.response0));
            });

            it('should make all models of sync views valid', function() {
                expect(ns.Model.get('mSync1').isValid()).to.be.ok;
                expect(ns.Model.get('mSync2').isValid()).to.be.ok;
                expect(ns.Model.get('mSync3').isValid()).to.be.ok;
            });

            it('should leave all models of async views invalid', function() {
                expect(ns.Model.get('mAsync1').isValid()).not.to.be.ok;
                expect(ns.Model.get('mAsync2').isValid()).not.to.be.ok;
            });

            it('should call perf once', function() {
                expect(ns.Update.prototype.perf).to.have.been.calledOnce;
            });

            it('should have had profiled stages `collectModels`, `requestSyncModels`', function() {
                var arg = ns.Update.prototype.perf.getCall(0).args[0];
                expect(arg).to.have.property('collectModels').that.is.at.least(0);
                expect(arg).to.have.property('requestSyncModels').that.is.at.least(0);
            });
        });

        describe('generateHTML', function() {
            beforeEach(function(done) {
                this.update = new ns.Update(this.view, ns.layout.page('asyncLayout', {}), {});
                this.update.generateHTML()
                    .then(function(html) {
                        this.$node = $(ns.html2node(html));
                        done();
                    }, this);

                this.sinon.server.requests[0].respond(200, {"Content-Type": "application/json"}, JSON.stringify(this.response0));
            });

            it('should create correctly nested nodes of sync views', function() {
                var vSync0node = this.$node.find('.ns-view-vSync0');

                expect(vSync0node.length).to.equal(1);
                expect(vSync0node.find('.ns-view-vSync1').length).to.equal(1);
                expect(vSync0node.find('.ns-view-vSync2').length).to.equal(1);
            });

            it('should create nodes of async views', function() {
                expect(this.$node.find('.ns-view-vAsync1').length).to.equal(1);
                expect(this.$node.find('.ns-view-vAsync2').length).to.equal(1);
            });

            it('should turn nodes of async views into async mode', function() {
                expect(this.$node.find('.ns-view-vAsync1.ns-async').length).to.equal(1);
                expect(this.$node.find('.ns-view-vAsync2.ns-async').length).to.equal(1);
            });

            it('should not create nodes of async views descendants', function() {
                expect(this.$node.find('.ns-view-vAsync3').length).to.equal(0);
                expect(this.$node.find('.ns-view-vAsync3').length).to.equal(0);
            });

            it('should call perf once', function() {
                expect(ns.Update.prototype.perf).to.have.been.calledOnce;
            });

            it('should have had profiled stages `collectModels`, `requestSyncModels`, `collectViews`, `generateHTML`', function() {
                var arg = ns.Update.prototype.perf.getCall(0).args[0];
                expect(arg).to.have.property('collectModels').that.is.at.least(0);
                expect(arg).to.have.property('requestSyncModels').that.is.at.least(0);
                expect(arg).to.have.property('collectViews').that.is.at.least(0);
                expect(arg).to.have.property('generateHTML').that.is.at.least(0);
            });
        });

        describe('render sync layout', function() {
            beforeEach(function(done) {
                this.update = new ns.Update(this.view, ns.layout.page('syncLayout', {}), {});
                this.update.render()
                    .then(function() {
                        done();
                    });

                this.sinon.server.requests[0].respond(200, {"Content-Type": "application/json"}, JSON.stringify(this.response0));
            });

            it('should make valid all related models', function() {
                expect(ns.Model.get('mSync1').isValid()).to.be.ok;
                expect(ns.Model.get('mSync2').isValid()).to.be.ok;
                expect(ns.Model.get('mSync3').isValid()).to.be.ok;
            });

            it('should create correctly nested nodes of views', function() {
                expect(this.view.$node.find('.ns-view-vSync0').length).to.equal(1);
                expect(this.view.$node.find('.ns-view-vSync0 .ns-view-vSync1').length).to.equal(1);
                expect(this.view.$node.find('.ns-view-vSync0 .ns-view-vSync2').length).to.equal(1);
                expect(this.view.$node.find('.ns-view-vSync3').length).to.equal(1);
                expect(this.view.$node.find('.ns-view-vSync4').length).to.equal(1);
            });

            it('should call perf once', function() {
                expect(ns.Update.prototype.perf).to.have.been.calledOnce;
            });

            it('should have had profiled stages `collectModels`, `requestSyncModels`, `collectViews`, `generateHTML`, `insertNodes`, `triggerEvents`', function() {
                var arg = ns.Update.prototype.perf.getCall(0).args[0];
                expect(arg).to.have.property('collectModels').that.is.at.least(0);
                expect(arg).to.have.property('requestSyncModels').that.is.at.least(0);
                expect(arg).to.have.property('collectViews').that.is.at.least(0);
                expect(arg).to.have.property('generateHTML').that.is.at.least(0);
                expect(arg).to.have.property('insertNodes').that.is.at.least(0);
                expect(arg).to.have.property('triggerEvents').that.is.at.least(0);
            });
        });

        describe('render async layout', function() {
            beforeEach(function(done) {
                this.modelsMethod = sinon.spy(ns.request, 'models');

                this.update = new ns.Update(this.view, ns.layout.page('asyncLayout', {}), {});
                this.update.render().then(function(result) {
                    result.async[0].then(function() {
                        result.async[1].then(function() {
                            done();
                        }, this);
                        this.sinon.server.requests[2].respond(200, {"Content-Type": "application/json"}, JSON.stringify(this.response2));
                    }, this);
                    this.sinon.server.requests[1].respond(200, {"Content-Type": "application/json"}, JSON.stringify(this.response1));
                }, this);

                this.sinon.server.requests[0].respond(200, {"Content-Type": "application/json"}, JSON.stringify(this.response0));
            });

            afterEach(function() {
                this.modelsMethod.restore();
            });

            it('should request models of sync views before models of async views', function() {
                var modelsFirst = ns.request.models.firstCall.args[0];
                var modelsSecond = ns.request.models.secondCall.args[0];
                var modelsThird = ns.request.models.thirdCall.args[0];

                expect(modelsFirst[0]).to.equal(ns.Model.get('mSync1'));
                expect(modelsFirst[1]).to.equal(ns.Model.get('mSync2'));
                expect(modelsFirst[2]).to.equal(ns.Model.get('mSync3'));

                expect(modelsSecond[0]).to.equal(ns.Model.get('mAsync1'));
                expect(modelsThird[0]).to.equal(ns.Model.get('mAsync2'));
            });

            it('should make all models of sync views valid', function() {
                expect(ns.Model.get('mSync1').isValid()).to.be.ok;
                expect(ns.Model.get('mSync2').isValid()).to.be.ok;
                expect(ns.Model.get('mSync3').isValid()).to.be.ok;
            });

            it('should make all models of async views valid', function() {
                expect(ns.Model.get('mAsync1').isValid()).to.be.ok;
                expect(ns.Model.get('mAsync2').isValid()).to.be.ok;
            });

            it('should create correctly nested nodes of sync views', function() {
                expect(this.view.$node.find('.ns-view-vSync0').length).to.equal(1);
                expect(this.view.$node.find('.ns-view-vSync0 .ns-view-vSync1').length).to.equal(1);
                expect(this.view.$node.find('.ns-view-vSync0 .ns-view-vSync2').length).to.equal(1);
            });

            it('should create nodes of async views', function() {
                expect(this.view.$node.find('.ns-view-vAsync1').length).to.equal(1);
                expect(this.view.$node.find('.ns-view-vAsync2').length).to.equal(1);
            });

            it('should create nodes of async views descendants', function() {

                // FIXME: в ns.View нужно распиливать метод _tryPushToRequest на 2 части:
                // 1. _updateAsyncState
                // 2. _tryPushToRequest

                // Пока кажется, что это распилить можно только вынесением рекурсивных
                // обходов из ns.View в ns.Update.
                // Аргументы за:
                // 1. Это необходимо для того, чтобы не вызывать _getRequestViews в сценарии rerender
                // 2. Это необходимо для нового сценария applyHTML (название скорее всего изменится)

                expect(this.view.$node.find('.ns-view-vSync3').length).to.equal(1);
                expect(this.view.$node.find('.ns-view-vSync4').length).to.equal(1);
            });

            it('should call perf three times', function() {
                expect(ns.Update.prototype.perf).to.have.been.calledThrise;
            });

            it('should have had profiled stages `collectModels`, `requestSyncModels`, `collectViews`, `generateHTML`, `insertNodes`, `triggerEvents` of first update', function() {
                var arg = ns.Update.prototype.perf.getCall(0).args[0];
                expect(arg).to.have.property('collectModels').that.is.at.least(0);
                expect(arg).to.have.property('requestSyncModels').that.is.at.least(0);
                expect(arg).to.have.property('collectViews').that.is.at.least(0);
                expect(arg).to.have.property('generateHTML').that.is.at.least(0);
                expect(arg).to.have.property('insertNodes').that.is.at.least(0);
                expect(arg).to.have.property('triggerEvents').that.is.at.least(0);
            });

            it('should have had profiled stages `collectViews`, `generateHTML`, `insertNodes`, `triggerEvents` of second update', function() {
                var arg = ns.Update.prototype.perf.getCall(1).args[0];

                expect(arg).to.have.property('collectViews').that.is.at.least(0);
                expect(arg).to.have.property('generateHTML').that.is.at.least(0);
                expect(arg).to.have.property('insertNodes').that.is.at.least(0);
                expect(arg).to.have.property('triggerEvents').that.is.at.least(0);
            });

            it('should have had profiled stages `collectViews`, `generateHTML`, `insertNodes`, `triggerEvents` of third update', function() {
                var arg = ns.Update.prototype.perf.getCall(2).args[0];

                expect(arg).to.have.property('collectViews').that.is.at.least(0);
                expect(arg).to.have.property('generateHTML').that.is.at.least(0);
                expect(arg).to.have.property('insertNodes').that.is.at.least(0);
                expect(arg).to.have.property('triggerEvents').that.is.at.least(0);
            });
        });

        describe('reconstruct sync layout', function() {
            beforeEach(function(done) {

                this.serverUpdate = new ns.Update(this.view, ns.layout.page('syncLayout', {}), {});
                this.serverUpdate.generateHTML()
                    .then(function(html) {

                        ns.reset();

                        this.createTestApp();

                        ns.Model.get('mSync1').setData(this.response0.models[0].data);
                        ns.Model.get('mSync2').setData(this.response0.models[1].data);
                        ns.Model.get('mSync3').setData(this.response0.models[2].data);
                        ns.Model.get('mCollection').setData(this.response0.models[3].data);

                        this.clientUpdate = new ns.Update(this.view, ns.layout.page('syncLayout', {}), {});
                        this.clientUpdate.reconstruct(ns.html2node(html))
                            .then(function() {
                                done();
                            });

                    }, this);

                this.sinon.server.requests[0].respond(200, {"Content-Type": "application/json"}, JSON.stringify(this.response0));
            });

            afterEach(function() {
                delete this.view;
            });

            it('should create correct views structure', function() {

                var firstViewsLevel = this.view.views;

                expect(firstViewsLevel.vSync0).to.be.ok;
                expect(firstViewsLevel.vSync3).to.be.ok;
                expect(firstViewsLevel.vSync4).to.be.ok;

                var secondViewsLevel = firstViewsLevel.vSync0.views;

                expect(secondViewsLevel.vSync1).to.be.ok;
                expect(secondViewsLevel.vSync2).to.be.ok;

                var collection = firstViewsLevel.vCollection;

                expect(collection).to.be.ok;
                expect(Object.keys(collection.views).length).to.equal(3);
            });

        });

        describe('reconstruct async layout', function() {
            beforeEach(function(done) {
                // Here we are in a server
                this.serverUpdate = new ns.Update(this.view, ns.layout.page('asyncLayout', {}), {});
                // Creating html
                this.serverUpdate.generateHTML()
                    .then(function(html) {

                        var data1 = ns.Model.get('mSync1').getData();
                        var data2 = ns.Model.get('mSync2').getData();
                        var data3 = ns.Model.get('mSync3').getData();

                        // This is a way to emulate switch of environment
                        ns.reset();

                        // Here we are already in a browser
                        this.createTestApp();

                        // Let's imagine, that we've transfered models data from server
                        ns.Model.get('mSync1').setData(data1);
                        ns.Model.get('mSync2').setData(data2);
                        ns.Model.get('mSync3').setData(data3);

                        // Firstly let's reconstruct our app, prerendered on a server
                        this.clientUpdate = new ns.Update(this.view, ns.layout.page('asyncLayout', {}), {});
                        this.clientUpdate.reconstruct(ns.html2node(html))
                            .then(function() {

                                // And secondly, let's run a regular update, that conceivably
                                // will be run by some kind of ns.page.go
                                this.update = new ns.Update(this.view, ns.layout.page('asyncLayout', {}), {});
                                this.update.render().then(function(result) {
                                    result.async[0].then(function() {
                                        result.async[1].then(function() {
                                            done();
                                        }, this);
                                        this.sinon.server.requests[2].respond(200, {"Content-Type": "application/json"}, JSON.stringify(this.response2));
                                    }, this);
                                    this.sinon.server.requests[1].respond(200, {"Content-Type": "application/json"}, JSON.stringify(this.response1));
                                }, this);

                            }, this);
                    }, this);

                this.sinon.server.requests[0].respond(200, {"Content-Type": "application/json"}, JSON.stringify(this.response0));
            });

            afterEach(function() {
                delete this.view;
            });

            it('should create correct views structure', function() {
                var firstViewsLevel = this.view.views;

                expect(firstViewsLevel.vSync0).to.be.ok;
                expect(firstViewsLevel.vAsync1).to.be.ok;
                expect(firstViewsLevel.vAsync2).to.be.ok;

                expect(firstViewsLevel.vSync0.views.vSync1).to.be.ok;
                expect(firstViewsLevel.vSync0.views.vSync2).to.be.ok;

                expect(firstViewsLevel.vAsync1.views.vSync3).to.be.ok;
                expect(firstViewsLevel.vAsync1.views.vSync4).to.be.ok;
            });

            it('should make valid models of async views', function() {
                // expect(ns.Model.getValid('mAsync1')).to.be.ok;
                // expect(ns.Model.getValid('mAsync2')).to.be.ok;
            });

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
                this.promise.then(function(result) {
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
                }, this);
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
                            .then(function() {

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

                            }, function() {
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
                    canRequest: function() {
                        // NOTE тут такой хитрый метод, чтобы первый раз выполнился запрос, но в случае ошибки - запрос не выполнялся.
                        return !this.getError();
                    }
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
                this.sinon.server.autoRespond = true;
                this.sinon.server.respond(function(xhr) {
                    xhr.respond(
                        200,
                        {"Content-Type": "application/json"},
                        JSON.stringify({
                            models: [
                                { data: true }
                            ]
                        })
                    );
                });

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
            });

            it('should reject promise with status MODELS when ns.request is failed', function(finish) {

                this.sinon.server.autoRespond = true;
                this.sinon.server.respond(function(xhr) {
                    xhr.respond(
                        500,
                        {"Content-Type": "application/json"},
                        JSON.stringify({
                            models: [
                                { data: true }
                            ]
                        })
                    );
                });

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

        it('check arg to ns.renderString', function() {
            var renderJSON = {
                'views': {
                    'main': {
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
            expect(ns.renderString.calledWithMatch(renderJSON)).to.be.equal(true);
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

            this.sinon.server.autoRespond = true;
            this.sinon.server.respondWith(function(xhr) {
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
                        .then(function() {
                            try {
                                expect($(that.view.node).find('.ns-async')).to.have.length(0);
                                finish();
                            } catch(e) {
                                finish(e);
                            }
                        }, function() {
                            finish('async ns.Update was rejected');
                        });
                }, function(err) {
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

    describe('Очереди, приоритеты, прерывания', function() {

        describe('2 ASYNC, потом 1 GLOBAL', function() {

            beforeEach(function() {
                ns.View.define('app');
                ns.layout.define('app', { app: {} });

                var layout = ns.layout.page('app');
                var view = ns.View.create('app');

                // запускаем 2 async
                this.asyncPromise1 = new ns.Update(view, layout, {}, { execFlag: ns.U.EXEC.ASYNC }).render();
                this.asyncPromise2 = new ns.Update(view, layout, {}, { execFlag: ns.U.EXEC.ASYNC }).render();

                // потому запускаем 1 async, он должен убить 2 предыдующих
                this.syncPromise = new ns.Update(view, layout, {}).render();
            });

            it('должен оборвать 1-й ASYNC', function(done) {
                this.asyncPromise1
                    .then(function() {
                        done('fulfilled')
                    }, function(reason) {
                        expect(reason).to.have.property('error').and.equal(ns.U.STATUS.EXPIRED);
                        done();
                    })
                    .then(null, function(err) {
                        done(err);
                    });
            });

            it('должен оборвать 2-й ASYNC', function(done) {
                this.asyncPromise2
                    .then(function() {
                        done('fulfilled')
                    }, function(reason) {
                        expect(reason).to.have.property('error').and.equal(ns.U.STATUS.EXPIRED)
                        done();
                    }).then(null, function(err) {
                        done(err);
                    });
            });

            it('должен зарезолвить SYNC', function(done) {
                this.syncPromise.then(function() {
                    done();
                }, function() {
                    done('rejected');
                });
            });

        });

    });

    describe('Валидный асинхронный вид не должен перерисоввываться просто так (demo for #450)', function() {

        beforeEach(function() {
            ns.layout.define('page1', {
                'app': {
                    'box@': {
                        'photo': {
                            'ads&' : true
                        }
                    }
                }
            });

            ns.router.routes = {
                'route': {
                    '/page1': 'page1'
                }
            };
            ns.router.init();

            ns.Model.define('my_model1');
            ns.Model.define('my_model2');

            ns.View.define('app');
            ns.View.define('photo', {
                models: [ 'my_model1' ]
            });
            ns.View.define('ads', {
                models: [ 'my_model2' ]
            });

            ns.MAIN_VIEW = ns.View.create('app');
        });

        afterEach(function() {
            delete this.promise;
        });

        it('Когда асинхронный вид отрисовался как синхронный повторный ns.page.go() не вызывает перерисовку асинхронного вида', function(done) {
            var that = this;

            ns.Model.get('my_model1').setData({ data: true });
            ns.Model.get('my_model2').setData({ data: true });

            ns.page.go('/page1')
                .then(function(info) {
                    expect(info.async.length).to.equal(0);

                    that.spy1 = sinon.spy(ns.MAIN_VIEW, '_getRequestViews');

                    ns.page.go(ns.page.currentUrl, 'preserve')
                        .then(function() {
                            expect(that.spy1.callCount).to.equal(1);
                            expect(that.spy1.firstCall.returnValue.sync.length).to.equal(0);
                            done();
                        });
                })
                .fail(function() {
                    finish('ns.Update fails');
                });
        });

    });

});
