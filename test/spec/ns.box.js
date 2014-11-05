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

    describe('view select', function() {

        describe('regular view', function() {

            beforeEach(function() {
                var layout = ns.layout.page('content2', {});
                return new ns.Update(this.APP, layout, {}).start();
            });

            it('should have node for "content2"', function() {
                expect($(this.APP.node).find('.ns-view-content2')).to.have.length(1);
            });

            it('should have visible node for "content2" ', function() {
                expect($(this.APP.node).find('.ns-view-content2').hasClass('ns-view-visible')).to.be.equal(true);
            });

        });

        describe('async view', function() {

            beforeEach(function() {
                var layout = ns.layout.page('content3', {});
                return new ns.Update(this.APP, layout, {}).start();
            });

            it('should have node for "content3"', function() {
                expect($(this.APP.node).find('.ns-view-content3')).to.have.length(1);
            });

            it('should have visible node for "content2" ', function() {
                //TODO: i'm not sure that this is valid test
                expect($(this.APP.node).find('.ns-view-content3').hasClass('ns-view-visible')).to.be.equal(false);
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
                        done()
                    });
                });
            });

            it('should have node for "content1" ', function() {
                expect($(this.APP.node).find('.ns-view-content1')).to.have.length(1);
            });

            it('should have visible node for "content1" ', function() {
                expect($(this.APP.node).find('.ns-view-content1').hasClass('ns-view-visible')).to.be.equal(true);
            });

            it('should have node for "content2" ', function() {
                expect($(this.APP.node).find('.ns-view-content2')).to.have.length(1);
            });

            it('should have hidden node for "content2" ', function() {
                expect($(this.APP.node).find('.ns-view-content2').hasClass('ns-view-hidden')).to.be.equal(true);
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

            it('should have two nodes for "content1" ', function() {
                expect($(this.APP.node).find('.ns-view-content1')).to.have.length(2);
            });

            it('should have first hidden node for "content1" ', function() {
                expect($(this.APP.node).find('.ns-view-content1:eq(0)').hasClass('ns-view-hidden')).to.be.equal(true);
            });

            it('should have second visible node for "content1" ', function() {
                expect($(this.APP.node).find('.ns-view-content1:eq(1)').hasClass('ns-view-visible')).to.be.equal(true);
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

            describe('first pass', function() {

                it('should create second "content3" node', function() {
                    var that = this;
                    expect(
                        $(that.APP.node).find('.ns-view-content3')
                    ).to.have.length(2)
                });

                it('should hide first "content3" node', function() {
                    var that = this;
                    expect(
                        $(that.APP.node).find('.ns-view-content3.ns-view-hidden')
                    ).to.have.length(1)
                });

                it('should show second "content3" node', function() {
                    var that = this;
                    expect(
                        $(that.APP.node).find('.ns-view-content3.ns-async')
                    ).to.have.length(1)
                });

            });

            describe('second pass', function() {

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
                    ).to.have.length(2)
                });

                it('should hide first "content3" node', function() {
                    var that = this;
                    expect(
                        $(that.APP.node).find('.ns-view-content3.ns-view-hidden')
                    ).to.have.length(1)
                });

                it('should show second "content3" node', function() {
                    var that = this;
                    expect(
                        $(that.APP.node).find('.ns-view-content3.ns-view-visible')
                    ).to.have.length(1)
                });

            });

        });

        describe('"content4"(pOwn=1) -> "content4"(pOwn=2), where pOwn depends only of models', function() {

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

            it('should have two nodes for "content4" ', function() {
                expect($(this.APP.node).find('.ns-view-content4')).to.have.length(2);
            });

            it('should have first hidden node for "content4" ', function() {
                expect($(this.APP.node).find('.ns-view-content4:eq(0)').hasClass('ns-view-hidden')).to.be.equal(true);
            });

            it('should have second visible node for "content4" ', function() {
                expect($(this.APP.node).find('.ns-view-content4:eq(1)').hasClass('ns-view-visible')).to.be.equal(true);
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

            it('should have two nodes for view "content1" ', function() {
                expect($(this.APP.node).find('.ns-view-content1').length).to.be.equal(2);
            });

            it('should have one visible node for view "content1" ', function() {
                expect($(this.APP.node).find('.ns-view-content1.ns-view-visible').length).to.be.equal(1);
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
                expect($(this.APP.node).find('.ns-view-content2:eq(0)').hasClass('ns-view-visible')).to.be.equal(true);
            });
        });

        describe('Update of ns.Box`s parent and child at the same time', function() {
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

            describe('single redraw', function() {
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

                it('should have 2 visible nodes for view vChild', function() {
                    expect(this.APP.node.querySelectorAll('.ns-view-vChild').length).to.be.equal(2);
                });

                it('should have 1 visible node for view vChild', function() {
                    expect(this.APP.node.querySelectorAll('.ns-view-vChild.ns-view-visible').length).to.be.equal(1);
                });

                it('should have 1 hidden node for view vChild', function() {
                    expect(this.APP.node.querySelectorAll('.ns-view-vChild.ns-view-hidden').length).to.be.equal(1);
                });
            });

            describe('multiple redraw', function() {
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

                it('should have 2 visible nodes for view vChild', function() {
                    expect(this.APP.node.querySelectorAll('.ns-view-vChild').length).to.be.equal(2);
                });

                it('should have 1 visible node for view vChild', function() {
                    expect(this.APP.node.querySelectorAll('.ns-view-vChild.ns-view-visible').length).to.be.equal(1);
                });

                it('should have 1 hidden node for view vChild', function() {
                    expect(this.APP.node.querySelectorAll('.ns-view-vChild.ns-view-hidden').length).to.be.equal(1);
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

        it('should have two boxes in "content@"', function() {
            expect(
                this.APP.node.querySelector('.ns-view-content').childNodes
            ).to.have.length(2)
        });

        it('should set "box1@" as hidden', function() {
            expect(
                this.APP.node.querySelector('.ns-view-box1').classList.contains('ns-view-hidden')
            ).to.equal(true)
        });

        it('should set "box2@" as visible', function() {
            expect(
                this.APP.node.querySelector('.ns-view-box2').classList.contains('ns-view-visible')
            ).to.equal(true)
        });

    });

    describe('views inside box keep sequence', function() {

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

        it('total of 3 views are inside .ns-view-content', function() {
            expect(this.children.length).to.be.equal(3);
        });

        it('first view is "a" and it is hidden', function() {
            expect($(this.children[0]).is('.ns-view-a.ns-view-hidden')).to.be.ok;
        });

        it('second view is also "a" and it is visible', function() {
            expect($(this.children[1]).is('.ns-view-a.ns-view-visible')).to.be.ok;
        });

        it('third one is "b" view and it is visible', function() {
            expect($(this.children[2]).is('.ns-view-b.ns-view-visible')).to.be.ok;
        });

    });

});
