describe('ns.page', function() {

    describe('ns.page.go', function() {

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

    describe('getDefaultUrl', function() {

        beforeEach(function() {
            sinon.stub(ns.router, 'url', no.nop)
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

    describe('goBack', function() {

        beforeEach(function() {
            ns.router.routes = {
                route: {
                    '/': 'messages',
                    '/inbox': 'messages'
                }
            };
            ns.router.init();
            ns.layout.define('messages', {'app':{}});
            ns.layout.define('not-found', {'app':{}});
            ns.MAIN_VIEW = {id: 'app'};

            sinon.spy(ns.page, 'go');
            sinon.stub(ns.page, 'getDefaultUrl', no.nop);
            sinon.stub(ns.Update.prototype, 'start', no.nop);
            sinon.stub(ns.history, 'pushState', no.nop);
        });

        afterEach(function() {
            ns.page.go.restore();
            ns.page.getDefaultUrl.restore();
            ns.Update.prototype.start.restore();
            ns.history.pushState.restore();
        });

        it('ns.page.go should add url to _history', function() {
            var url = '/inbox?test=' + Math.random();

            ns.page.go(url);
            ns.page.goBack();

            expect(ns.page.go.getCall(1).calledWithExactly(url, true)).to.be.ok();
        });

        it('goBack should call getDefaultUrl if no urls in history', function() {
            ns.page.goBack();
            expect(ns.page.getDefaultUrl.calledOnce).to.be.ok();
        });

    });

});
