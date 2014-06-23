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
                                return Vow.fulfill();
                            }
                        };
                    });

                    this.spy = this.sinon.spy();
                    ns.events.on('ns-page-before-load', this.spy);
                });

                afterEach(function() {
                    ns.events.off('ns-page-before-load');
                });

                it('should trigger ns-page-before-load event', function(done) {
                    var that = this;
                    ns.page.go('/inbox').then(function() {
                        expect(that.spy).to.have.callCount(1);
                        done();
                    }, function() {
                        done('reject')
                    });
                });

                it('should trigger ns-page-before-load event with valid arguments', function(done) {
                    var that = this;
                    ns.page.go('/inbox').then(function() {
                        expect(that.spy).have.been.calledWith(
                            'ns-page-before-load',
                            [ {}, { page: 'inbox', params: {}, layout: ns.layout.page('inbox', {}) } ],
                            '/inbox'
                        );

                        done();
                    }, function() {
                        done('reject')
                    });
                });

                it('should trigger ns-page-before-load with old and new pages', function(done) {
                    var that = this;
                    ns.page.go('/inbox').then(function() {
                        ns.page.go('/message/1').then(function() {
                            expect(that.spy).have.been.calledWith(
                                'ns-page-before-load',
                                [
                                    { page: 'inbox', params: {}, layout: ns.layout.page('inbox', {}) },
                                    { page: 'message', params: { id: '1' }, layout: ns.layout.page('message', { id: '1' }) }
                                ],
                                '/message/1'
                            );

                            done();

                        });
                    });
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
