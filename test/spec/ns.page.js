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

});
