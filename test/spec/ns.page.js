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

});
