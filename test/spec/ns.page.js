describe('ns.page', function() {

    describe('ns.page.go', function() {

        describe('redirect', function() {

            beforeEach(function() {
                ns.router.routes = {
                    redirect: {
                        '/': '/inbox'
                    },
                    route: {
                        '/inbox': 'messages',
                        '/message/{mid:int}': 'message'
                    }
                };
                ns.router.init();

                this.sinon.stub(ns.page, 'redirect');
            });

            it('calls ns.page.redirect in "/" ', function() {
                ns.page.go('/');

                expect(ns.page.redirect.calledOnce).to.be.equal(true);
            });

        });

        describe('go()', function() {
            beforeEach(function() {
                ns.View.define('app');
                ns.View.define('message', { params: { id: null } });
                ns.layout.define('inbox', {
                    'app': {}
                });
                ns.layout.define('message', {
                    'message': {}
                });
                ns.router.routes = {
                    route: {
                        '/inbox': 'inbox',
                        '/message/{id:int}': 'message'
                    }
                };
                ns.router.init();

                this.sinon.stub(ns.page, 'title');
            });

            describe('event ns.page#ns-page-before-load', function() {

                beforeEach(function() {
                    this.sinon.stub(ns, 'Update', function() {
                        return {
                            start: function() {
                                return new Vow.Promise();
                            }
                        };
                    });
                });

                it('should trigger ns-page-before-load event', function() {
                    var spy = this.sinon.spy();
                    ns.events.on('ns-page-before-load', spy);
                    ns.page.go('/inbox');

                    expect(spy.calledOnce).to.be.equal(true);
                    expect(spy.firstCall.args[0]).to.be.equal('ns-page-before-load');
                    expect(spy.firstCall.args[1]).to.be.eql([ {}, { page: 'inbox', params: {}, layout: ns.layout.page('inbox', {}) } ]);
                    expect(spy.firstCall.args[2]).to.be.equal('/inbox');
                });

                it('should trigger ns-page-before-load with old and new pages', function() {
                    var spy = this.sinon.spy();
                    ns.events.on('ns-page-before-load', spy);
                    ns.page.go('/inbox');
                    ns.page.go('/message/1');

                    expect(spy.calledTwice).to.be.equal(true);
                    expect(spy.secondCall.args[0]).to.be.equal('ns-page-before-load');
                    expect(spy.secondCall.args[1]).to.be.eql([
                        { page: 'inbox', params: {}, layout: ns.layout.page('inbox', {}) },
                        { page: 'message', params: { id: '1' }, layout: ns.layout.page('message', { id: '1' }) }
                    ]);
                    expect(spy.secondCall.args[2]).to.be.equal('/message/1');
                });


            });

            describe('event ns.page#ns-page-after-load', function() {

                beforeEach(function(done) {
                    this.sinon.stub(ns, 'Update', function() {
                        return {
                            start: function() {
                                return Vow.fulfill('fulfilled');
                            }
                        };
                    });

                    this.spy = this.sinon.spy();
                    ns.events.on('ns-page-after-load', this.spy);
                    ns.page.go('/inbox')
                        .then(function(){
                            done();
                        });
                });

                afterEach(function() {
                    delete this.promise;
                    delete this.spy;
                });

                it('should trigger ns-page-after-load', function() {
                    expect(this.spy).to.have.callCount(1);
                });

                it('should trigger with promise fulfilled value', function() {
                    expect(this.spy).have.been.calledWith('ns-page-after-load', 'fulfilled');
                });

            });

            describe('event ns.page#ns-page-error-load', function() {

                beforeEach(function(done) {
                    this.sinon.stub(ns, 'Update', function() {
                        return {
                            start: function() {
                                return Vow.reject('rejected');
                            }
                        };
                    });

                    this.spy = this.sinon.spy();
                    ns.events.on('ns-page-error-load', this.spy);
                    ns.page.go('/inbox')
                        .then(null, function(){
                            done();
                        });
                });

                afterEach(function() {
                    delete this.promise;
                    delete this.spy;
                });

                it('should trigger ns-page-error-load', function() {
                    expect(this.spy).to.have.callCount(1);
                });

                it('should trigger with promise rejected value', function() {
                    expect(this.spy).have.been.calledWith('ns-page-error-load', 'rejected');
                });

            });


        });

    });

    describe('getDefaultUrl', function() {

        beforeEach(function() {
            this.sinon.stub(ns.router, 'url', no.nop);
        });

        it('should exists', function() {
            expect(ns.page.getDefaultUrl).to.be.a('function');
        });

        it('should call ns.router.url', function() {
            ns.page.getDefaultUrl();
            expect(ns.router.url.calledOnce).to.be.equal(true);
        });

        it('should call ns.router.url with "/" arg', function() {
            ns.page.getDefaultUrl();
            expect(ns.router.url.calledWithExactly('/')).to.be.equal(true);
        });

    });

});
