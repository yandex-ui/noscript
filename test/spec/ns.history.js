describe('ns.history', function() {

    // PhantomJS не умеет работать с URL
    if (/PhantomJS\//.test(navigator.userAgent)) {
        return;
    }

    var original = window.location.pathname + window.location.search;

    afterEach(function() {
        window.history.replaceState(null, 'test', original);
    });

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

        it('ns.history.adapt should be defined', function() {
            expect(ns.history.adapt).to.be.a('function');
        });

        it('ns.history.legacy should have a specific value', function() {
            expect(ns.history.legacy).to.be.a('boolean');
        });

    });

    describe('behavior in modern browsers', function() {

        var url = '/some/address/with%20spaces/';

        it('ns.history.legacy should be false', function() {
            expect(ns.history.legacy).to.be(false);
        });

        it(!!window['phantom'] + ' 121212ns.history.pushState should change the address bar URL to the one passed in', function() {
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

    describe('adapting hashed URLs to their original versions', function() {

        beforeEach(function() {
            ns.router.routes = {
                route: {
                    '/message/{message-id:int}': 'layout',
                    '/photo/{photo-id:int}': 'layout',
                    '/': 'layout'
                }
            };
            ns.router.init();

            // заменяем ns.page.go на пустую функцию, нам там нечего проверять
            sinon.stub(ns.page, 'go', no.nop);
        });

        afterEach(function() {
            ns.page.go.restore();
        });

        it('should happen when the hash matches any of the defined routes', function(done) {

            window.history.pushState(null, 'test', '/#/message/123/');

            ns.history.adapt();

            setTimeout(function() {
                expect(window.location.pathname + window.location.search).to.be('/message/123/');
                done();
            }, 0);

        });

        it('should keep the query params', function(done) {

            window.history.pushState(null, 'test', '/?debug=true&append=%25a%25#/message/123/?param=1');

            ns.history.adapt();

            setTimeout(function() {
                expect(window.location.pathname + window.location.search).to.be('/message/123/?param=1&debug=true&append=%25a%25');
                done();
            }, 0);

        });

        it('should not happen when the hash is a random non-route string', function(done) {

            window.history.pushState(null, 'test', '/?debug=true#top');

            ns.history.adapt();

            setTimeout(function() {
                expect(window.location.pathname + window.location.search + window.location.hash).to.be('/?debug=true#top');
                done();
            }, 0);

        });

        it('should not happen when both pathname and hash match routes', function(done) {

            window.history.pushState(null, 'test', '/message/123/#/photo/321/');

            ns.history.adapt();

            setTimeout(function() {
                expect(window.location.pathname + window.location.search).to.be('/message/123/');
                done();
            }, 0);

        });

    });

});
