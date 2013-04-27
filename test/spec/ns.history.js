describe('ns.history', function() {

    describe('API', function() {

        it('ns.history should be defined', function() {
            expect(ns.history).to.be.an('object');
        });

        it('ns.history.pushState should be defined', function() {
            expect(ns.history.pushState).to.be.a('function');
        });

        it('ns.history.replaceState should be defined', function() {
            expect(ns.history.replaceState).to.be.a('function');
        });

        it('ns.history.legacy should have a specific value', function() {
            expect(ns.history.legacy).to.be.a('boolean');
        });

    });

    describe('behavior in modern browsers', function() {

        var original = window.location.pathname + window.location.search;
        var url = '/some/address/with%20spaces/'

        afterEach(function() {
            window.history.replaceState(null, 'test', original);
        });

        it('ns.history.legacy should be false', function() {
            expect(ns.history.legacy).to.be(false);
        });

        it('ns.history.pushState should change the address bar URL to the one passed in', function() {
            ns.history.pushState(url);

            expect(window.location.pathname + window.location.search).to.be(url);
        });

        it('ns.history.pushState should not trigger popstate event', function(done) {
            var triggered = false;
            var onpopstate = function() { triggered = true; };

            window.addEventListener('popstate', onpopstate, false);

            ns.history.pushState(url);

            setTimeout(function() {
                expect(triggered).to.be(false);
                window.removeEventListener('popstate', onpopstate);
                done();
            }, 0);
        });

    });

});
