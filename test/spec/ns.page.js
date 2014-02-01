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

                sinon.stub(ns.page, 'redirect', no.nop);
            });

            afterEach(function() {
                ns.page.redirect.restore();
            });

            it('calls ns.page.redirect in "/" ', function() {
                ns.page.go('/');

                expect(ns.page.redirect.calledOnce).to.be.ok();
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

                sinon.stub(ns.history, 'pushState', function() {});
                sinon.stub(ns.history, 'replaceState', function() {});
                sinon.stub(ns.page, 'title', function() {});
                sinon.stub(ns, 'Update', function() { return { start: function() {} }; });
            });

            afterEach(function() {
                ns.history.pushState.restore();
                ns.history.replaceState.restore();
                ns.page.title.restore();
                ns.Update.restore();
            });

            it('should trigger ns-page-before-load event', function() {
                var spy = sinon.spy();
                ns.events.on('ns-page-before-load', spy);
                ns.page.go('/inbox');

                expect(spy.calledOnce).to.be.ok();
                expect(spy.firstCall.args[0]).to.be('ns-page-before-load');
                expect(spy.firstCall.args[1]).to.be.eql([ {}, { page: 'inbox', params: {}, layout: ns.layout.page('inbox', {}) } ]);
                expect(spy.firstCall.args[2]).to.be('/inbox');
            });

            it('should trigger ns-page-before-load with old and new pages', function() {
                var spy = sinon.spy();
                ns.events.on('ns-page-before-load', spy);
                ns.page.go('/inbox');
                ns.page.go('/message/1');

                expect(spy.calledTwice).to.be.ok();
                expect(spy.secondCall.args[0]).to.be('ns-page-before-load');
                expect(spy.secondCall.args[1]).to.be.eql([
                    { page: 'inbox', params: {}, layout: ns.layout.page('inbox', {}) },
                    { page: 'message', params: { id: '1' }, layout: ns.layout.page('message', { id: '1' }) }
                ]);
                expect(spy.secondCall.args[2]).to.be('/message/1');
            });

        });

    });

    describe('getDefaultUrl', function() {

        beforeEach(function() {
            sinon.stub(ns.router, 'url', no.nop);
        });

        afterEach(function() {
            ns.router.url.restore();
        });

        it('should exists', function() {
            expect(ns.page.getDefaultUrl).to.be.ok();
        });

        it('should call ns.router.url', function() {
            ns.page.getDefaultUrl();
            expect(ns.router.url.calledOnce).to.be.ok();
        });

        it('should call ns.router.url with "/" arg', function() {
            ns.page.getDefaultUrl();
            expect(ns.router.url.calledWithExactly('/')).to.be.ok();
        });

    });

});
