describe('ns.Box', function() {

    beforeEach(function() {
        ns.layout.define('app', {
            'app': {
                'content@': true
            }
        });

        ns.layout.define('content1', {
            'app content@': {
                'content1': {}
            }
        }, 'app');

        ns.layout.define('content2', {
            'app content@': {
                'content2': {}
            }
        }, 'app');

        ns.layout.define('content3', {
            'app content@': {
                'content3&': {}
            }
        }, 'app');

        ns.layout.define('content4', {
            'app content@': {
                'content4': {}
            }
        }, 'app');

        ns.layout.define('parent1', {
            'app': {
                'parent': {
                    'content@': {
                        'content1': true
                    }
                }
            }
        });

        ns.layout.define('parent2', {
            'app': {
                'parent': {
                    'content@': {
                        'content2': true
                    }
                }
            }
        });

        ns.View.define('app');
        ns.View.define('content1', {
            params: {
                p: null
            }
        });
        ns.View.define('content2');
        ns.View.define('content3', {
            models: ['model3']
        });

        ns.View.define('content4', {
            params: function() {
                return {
                    pOwn: ns.Model.getValid('model4').get('.value')
                };
            }
        });

        ns.View.define('parent', {
            p: null
        });

        ns.Model.define('model3', {
            params: {
                p: null
            }
        });

        ns.Model.define('model4', {});

        /**
         * @type {ns.View}
         */
        this.APP = ns.View.create('app');
    });

    afterEach(function() {
        delete this.APP;
    });

    describe('#destroy', function() {

        beforeEach(function() {
            this.sinon.spy(ns.View.prototype, 'destroy');
            this.sinon.spy(ns.Box.prototype, 'destroy');

            var that = this;

            var page1Params = {};
            var page1 = ns.layout.page('content2', page1Params);
            var page2Params = {p: 1};
            var page2 = ns.layout.page('content1', page2Params);

            return new ns.Update(this.APP, page1, page1Params).render()
                .then(function() {
                    return new ns.Update(that.APP, page2, page2Params).render();
                });
        });

        it('должен вызвать #destroy у ns.Box', function() {
            this.APP.destroy();
            expect(ns.Box.prototype.destroy).to.have.callCount(1);
        });

        it('должен уничтожить все виды внутри бокса', function() {
            this.APP.destroy();
            // app + content1 + content2
            expect(ns.View.prototype.destroy).to.have.callCount(3);
        });

    });

    describe('#invalidate', function() {

        beforeEach(function() {
            var layout = ns.layout.page('content2', {});
            return new ns.Update(this.APP, layout, {}).render().then(function() {
                this.sinon.spy(ns.View.prototype, 'invalidate');
                var layout = ns.layout.page('content1', {p: 1});
                return new ns.Update(this.APP, layout, {p: 1}).render();
            }, this);
        });

        it('должен вызывать invalidate для всех видов в ns.Box', function() {
            this.APP.invalidate();

            // не знаю другого способа проверить, что все виды в дереве невалидны

            // app + box + 2 вида внутри
            expect(this.APP._getDescendantsAndSelf()).to.have.length(4);

            this.APP._getDescendantsAndSelf().forEach(function(view) {
                if (view instanceof ns.Box) {
                    return;
                }
                expect(view.isValid()).to.be.equal(false);
            });

        });

    });

    describe('view select ->', function() {

        describe('regular view ->', function() {

            beforeEach(function() {
                var layout = ns.layout.page('content2', {});
                return new ns.Update(this.APP, layout, {}).start();
            });

            it('should have node for "content2"', function() {
                expect($(this.APP.node).find('.ns-view-content2')).to.have.length(1);
            });

        });

        describe('async view ->', function() {

            beforeEach(function() {
                var layout = ns.layout.page('content3', {});
                return new ns.Update(this.APP, layout, {}).start();
            });

            it('should have node for "content3"', function() {
                expect($(this.APP.node).find('.ns-view-content3')).to.have.length(1);
            });

        });

    });

    describe('view change', function() {

        describe('"content2" -> "content1"', function() {

            beforeEach(function(done) {
                var that = this;
                new ns.Update(
                    this.APP,
                    ns.layout.page('content2', {}),
                    {}
                ).start().then(function() {
                    var page2Params = {p: 1};
                    new ns.Update(
                        that.APP,
                        ns.layout.page('content1', page2Params),
                        page2Params
                    ).start().then(function() {
                        done();
                    });
                });
            });

            it('should have node for "content1" ', function() {
                expect($(this.APP.node).find('.ns-view-content1')).to.have.length(1);
            });

            it('should not have node for "content2" ', function() {
                expect($(this.APP.node).find('.ns-view-content2')).to.have.length(0);
            });

        });

        describe('"content1"(p=1) -> "content1"(p=2)', function() {

            beforeEach(function(done) {
                var page1Params = {p: 1};
                var that = this;
                new ns.Update(
                    this.APP,
                    ns.layout.page('content1', page1Params),
                    page1Params
                ).start().then(function() {
                    var page2Params = {p: 2};
                    new ns.Update(
                        that.APP,
                        ns.layout.page('content1', page2Params),
                        page2Params
                    ).start().then(function() {
                        done();
                    });
                });
            });

            it('should have one node for "content1" ', function() {
                expect($(this.APP.node).find('.ns-view-content1')).to.have.length(1);
            });

            it('should have second visible node for "content1" (view=content1&p=2) ', function() {
                expect($(this.APP.node).find('.ns-view-content1[data-key="view=content1&p=2"]')).to.be.length(1);
            });

        });

        describe('"async-view"(p=1) -> "async-view"(p=2)', function() {

            beforeEach(function(done) {
                var page1Params = {p: 1};
                var that = this;

                new ns.Update(
                    this.APP,
                    ns.layout.page('content3', page1Params),
                    page1Params
                ).start().then(function(promises) {

                    // finish first draw
                    that.sinon.server.requests[0].respond(
                        200,
                        {"Content-Type": "application/json"},
                        JSON.stringify({
                            models: [
                                {data: true}
                            ]
                        })
                    );

                    Vow.all(promises.async).then(function() {
                        var page2Params = {p: 2};
                        new ns.Update(
                            that.APP,
                            ns.layout.page('content3', page2Params),
                            page2Params
                        ).start().then(function() {
                            done();
                        });
                    });
                });
            });

            describe('first pass ->', function() {

                it('should create second "content3" node', function() {
                    var that = this;
                    expect(
                        $(that.APP.node).find('.ns-view-content3')
                    ).to.have.length(1);
                });

                it('should show second "content3" node', function() {
                    var that = this;
                    expect(
                        $(that.APP.node).find('.ns-view-content3.ns-async')
                    ).to.have.length(1);
                });

            });

            describe('second pass ->', function() {

                beforeEach(function(done) {
                    this.sinon.server.requests[1].respond(
                        200,
                        {"Content-Type": "application/json"},
                        JSON.stringify({
                            models: [
                                {data: true}
                            ]
                        })
                    );

                    // ждем завершения второго update
                    // вот это неправильный код, но нет времени переписывать
                    window.setTimeout(function() {
                        done();
                    }, 10);
                });

                it('should create second "content3" node', function() {
                    var that = this;
                    expect(
                        $(that.APP.node).find('.ns-view-content3')
                    ).to.have.length(1);
                });

                it('should show second "content3" node ("view=content3&p=2")', function() {
                    var that = this;
                    expect(
                        $(that.APP.node).find('.ns-view-content3[data-key="view=content3&p=2"]')
                    ).to.have.length(1);
                });

            });

        });

        describe('"content4"(pOwn=1) -> "content4"(pOwn=2), where pOwn depends only of models ->', function() {

            beforeEach(function(done) {
                var model = ns.Model.get('model4');
                model.setData({'value': 1});

                var that = this;

                new ns.Update(
                    this.APP,
                    ns.layout.page('content4', {}),
                    {}
                ).start().then(function() {
                    model.set('.value', 2);
                    new ns.Update(
                        that.APP,
                        ns.layout.page('content4', {}),
                        {}
                    ).start().then(function() {
                        done();
                    });
                });
            });

            it('should have one node for "content4" ', function() {
                expect($(this.APP.node).find('.ns-view-content4')).to.have.length(1);
            });

            it('should have second visible node for "content4" "view=content4&pOwn=2"', function() {
                expect($(this.APP.node).find('.ns-view-content4[data-key="view=content4&pOwn=2"]')).to.have.length(1);
            });

        });

        describe('"parent1"(p=1) -> "parent1"(p=2)', function() {

            beforeEach(function(done) {
                var params1 = {p: 1};
                var that = this;
                new ns.Update(
                    this.APP,
                    ns.layout.page('parent1', params1),
                    params1
                ).start().then(function() {
                    var params2 = {p: 2};
                    new ns.Update(
                        that.APP,
                        ns.layout.page('parent1', params2),
                        params2
                    ).start().then(function() {
                        done();
                    });
                });
            });

            it('should have one node for view "content1" ', function() {
                expect($(this.APP.node).find('.ns-view-content1')).to.be.length(1);
            });

            it('should have one visible node for view "content1" "view=content1&p=2" ', function() {
                expect($(this.APP.node).find('.ns-view-content1[data-key="view=content1&p=2"]')).to.be.length(1);
            });
        });

        describe('"parent2"(p=1) -> "parent2"(p=2)', function() {

            beforeEach(function(done) {
                var params1 = {p: 1};
                var that = this;
                new ns.Update(
                    this.APP,
                    ns.layout.page('parent2', params1),
                    params1
                ).start().then(function() {
                    var params2 = {p: 2};
                    new ns.Update(
                        that.APP,
                        ns.layout.page('parent2', params2),
                        params2
                    ).start().then(function() {
                        done();
                    });
                });
            });

            it('should have one node for view "content2" ', function() {
                expect($(this.APP.node).find('.ns-view-content2').length).to.be.equal(1);
            });

            it('should have one visible for view "content2" ', function() {
                expect($(this.APP.node).find('.ns-view-content2')).to.be.length(1);
            });
        });

        describe('Update of ns.Box`s parent and child at the same time ->', function() {
            beforeEach(function() {

                // layout
                ns.layout.define('parent3', {
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
                ns.View.define('vParent', {
                    models: ['mParent']
                });

                ns.View.define('vChild', {
                    models: ['mChild']
                });

            });

            afterEach(function() {
                delete this.APP;
            });

            describe('single redraw ->', function() {
                beforeEach(function(done) {
                    var APP = this.APP;

                    // update 1
                    new ns.Update(
                        this.APP,
                        ns.layout.page('parent3', {p: 1}),
                        {p: 1}
                    ).start().done(function() {

                        ns.Model.get('mParent', {}).set('.foo', 'bar2');
                        // update 2
                        new ns.Update(
                            APP,
                            ns.layout.page('parent3', {p: 2}),
                            {p: 2}
                        ).start()
                            .done(function() {
                                done();
                            });
                    });
                });

                it('should have 1 visible node for view vChild', function() {
                    expect(this.APP.node.querySelectorAll('.ns-view-vChild')).to.have.length(1);
                });

                it('should have 1 visible node for view vChild', function() {
                    expect(this.APP.node.querySelectorAll('.ns-view-vChild[data-key="view=vChild&p=2"]')).to.have.length(1);
                });

            });

            describe('multiple redraw ->', function() {
                beforeEach(function(done) {
                    var APP = this.APP;

                    // update 1
                    new ns.Update(
                        this.APP,
                        ns.layout.page('parent3', {p: 1}),
                        {p: 1}
                    ).start().done(function() {

                        ns.Model.get('mParent', {}).set('.foo', 'bar2');
                        // update 2
                        new ns.Update(
                            APP,
                            ns.layout.page('parent3', {p: 2}),
                            {p: 2}
                        ).start()
                            .done(function() {

                                ns.Model.get('mParent', {}).set('.foo', 'bar3');
                                // update 2
                                new ns.Update(
                                    APP,
                                    ns.layout.page('parent3', {p: 1}),
                                    {p: 1}
                                ).start()
                                    .done(function() {
                                        done();
                                    });

                            });
                    });
                });

                it('should have 1 visible node for view vChild', function() {
                    expect(this.APP.node.querySelectorAll('.ns-view-vChild').length).to.be.equal(1);
                });

                it('should have 1 visible node for view vChild', function() {
                    expect(this.APP.node.querySelectorAll('.ns-view-vChild[data-key="view=vChild&p=1"]')).to.have.length(1);
                });

            });

        });

    });

    describe('box -> box', function() {

        beforeEach(function(done) {

            ns.layout.define('box1', {
                'app content@': {
                    'box1@': {}
                }
            }, 'app');

            ns.layout.define('box2', {
                'app content@': {
                    'box2@': {}
                }
            }, 'app');

            new ns.Update(
                this.APP,
                ns.layout.page('box1', {}),
                {}
            ).start().done(function() {

                new ns.Update(
                    this.APP,
                    ns.layout.page('box2', {}),
                    {}
                ).start().done(function() {
                    done();
                });

            }.bind(this));

        });

        it('should have one box in "content@"', function() {
            expect(
                this.APP.node.querySelector('.ns-view-content').childNodes
            ).to.have.length(1);
        });

        it('should remove "box1@" from DOM', function() {
            expect(
                this.APP.node.querySelectorAll('.ns-view-box1')
            ).to.have.length(0);
        });

        it('should set "box2@" as visible', function() {
            expect(
                this.APP.node.querySelectorAll('.ns-view-box2')
            ).to.have.length(1);
        });

    });

    describe('views inside box keep sequence ->', function() {

        beforeEach(function(finish) {

            var that = this;

            ns.router.routes = {
                route: {
                    '/{t=zero}': 'index'
                }
            };
            ns.router.init();

            ns.layout.define('index', {
                'app': {
                    'content@': {
                        'a': null,
                        'b': null
                    }
                }
            });

            ns.View.define('a', { params: { 't': null } });
            ns.View.define('b');

            var that = this;
            ns.MAIN_VIEW = ns.View.create('app');

            ns.page.go('/')
                .then(function() {
                    ns.page.go('/one')
                        .then(function() {
                            that.children = ns.MAIN_VIEW.$node.find('.ns-view-content')[0].childNodes;
                            finish();
                        }, function() {
                            finish('ns.Update fails');
                        });

                }, function() {
                    finish('ns.Update fails');
                });
        });

        afterEach(function() {
            ns.reset();
        });

        it('total of 2 views are inside .ns-view-content', function() {
            expect(this.children.length).to.be.equal(2);
        });

        it('first view is "a" with param one', function() {
            expect($(this.children[0]).is('.ns-view-a')).to.be.ok;
            expect($(this.children[0]).data('key')).to.be.equal('view=a&t=one');
        });

        it('third one is "b"', function() {
            expect($(this.children[1]).is('.ns-view-b')).to.be.ok;
        });

    });

    /*
        For url '/' we get:
            app
                content
                    a
                    b
                    c

        for url '/2' we get:
            app
                content
                    c
                    b
                    a

        a, b and c are just sorted in a new way.
    */
    describe('sorting views inside box ->', function() {

        beforeEach(function(finish) {
            ns.router.routes = {
                route: {
                    '/':  'index1',
                    '/2': 'index2'
                }
            };
            ns.router.init();

            ns.layout.define('index1', {
                'app': {
                    'content@': {
                        'a': null,
                        'b': null,
                        'c': null
                    }
                }
            });

            ns.layout.define('index2', {
                'app': {
                    'content@': {
                        'c': null,
                        'b': null,
                        'a': null
                    }
                }
            });

            ns.View.define('a');
            ns.View.define('b');
            ns.View.define('c');

            var that = this;
            ns.MAIN_VIEW = ns.View.create('app');

            ns.page.go('/')
                .then(function() {
                    ns.page.go('/2')
                        .then(function() {
                            that.children = ns.MAIN_VIEW.$node.find('.ns-view-content')[0].childNodes;
                            finish();
                        }, function() {
                            finish('ns.Update fails');
                        });

                }, function() {
                    finish('ns.Update fails');
                });
        });

        afterEach(function() {
            ns.reset();
        });

        it('total of 3 views are inside .ns-view-content', function() {
            expect(this.children.length).to.be.equal(3);
        });

        it('first view is "c"', function() {
            expect($(this.children[0]).is('.ns-view-c')).to.be.ok;
        });

        it('second view is "b"', function() {
            expect($(this.children[1]).is('.ns-view-b')).to.be.ok;
        });

        it('finally third view is "a"', function() {
            expect($(this.children[2]).is('.ns-view-a')).to.be.ok;
        });

    });

    describe('do not sort view nodes when nothing have changed', function() {

        beforeEach(function(finish) {
            var that = this;

            ns.router.routes = {
                route: {
                    '/':  'index1'
                }
            };
            ns.router.init();

            ns.layout.define('index1', {
                'app': {
                    'content@': {
                        'a': null,
                        'b': null
                    }
                }
            });

            ns.View.define('a');
            ns.View.define('b');

            ns.MAIN_VIEW = ns.View.create('app');

            // Create mutation observer to listen to DOM mutations.
            var observerConfig = { attributes: true, childList: true, characterData: true };
            this.domSpy = sinon.spy();
            this.observer = new MutationObserver(this.domSpy);

            ns.page.go('/')
                .then(function() {
                    // Start observing DOM mutations.
                    that.observer.observe(ns.MAIN_VIEW.node, observerConfig);

                    // Redraw current page.
                    ns.page.go(ns.page.currentUrl, 'preserve')
                        .then(function() {
                            finish();
                        }, function() {
                            finish('ns.Update fails');
                        });

                }, function() {
                    finish('ns.Update fails');
                });
        });

        afterEach(function() {
            this.observer.disconnect();
            ns.reset();
        });

        it('No DOM mutations are performed when page is redrawn and all views a valid', function(finish) {
            var that = this;

            // MutationObserver is called in async way.
            setTimeout(function() {
                expect(that.domSpy.called).to.be.equal(false);
                finish();
            }, 100);
        });

    });

    describe('Box should sort only sibling view nodes', function() {

        beforeEach(function(finish) {
            ns.router.routes = {
                route: {
                    '/':  'index'
                }
            };
            ns.router.init();

            ns.layout.define('index', {
                'app content@': {
                    'a': {
                        'b-box@': {
                            'b': true,
                        }
                    },
                    'c': true,
                }
            }, 'app');

            ns.View.define('a');
            ns.View.define('b');
            ns.View.define('c');

            ns.MAIN_VIEW = ns.View.create('app');

            ns.page.go('/')
                .then(function() {
                    finish();
                }, function() {
                    finish('it was failing on first render because if was trying to sort c and b while they are in different boxes');
                });
        });

        afterEach(function() {
            ns.reset();
        });

        it('If you get here - everything is fine', function() {
            expect(true).to.be.ok;
        });

    });

    describe('Box should hide inactive views only', function() {
        beforeEach(function() {
            var that = this;
            var page1Params = {};
            var page1 = ns.layout.page('content2', page1Params);
            var page2Params = {p: 1};
            var page2 = ns.layout.page('content1', page2Params);

            return new ns.Update(this.APP, page1, page1Params).render()
                .then(function() {
                    return new ns.Update(that.APP, page2, page2Params).render();
                });
        });
        
        it('view content2 should be hidden', function() {
            var views = this.APP.views.content.views;
            expect(views['view=content2'].isVisible()).to.be.equal(false);
        });

        it('view content1 should be visible', function() {
            var views = this.APP.views.content.views;
            expect(views['view=content1&p=1'].isVisible()).to.be.equal(true);
        });
    });

});
