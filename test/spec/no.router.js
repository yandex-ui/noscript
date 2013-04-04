describe('ns.router', function() {

    describe('API', function() {

        it('should be defined', function() {
            expect(ns.router).to.be.a('function');
        });

        it('ns.router.init should be defined', function() {
            expect(ns.router.init).to.be.a('function');
        });

        it('ns.router.routes should be defined', function() {
            expect(ns.router.routes).to.be.an('object');
        });

        it('ns.router.regexps should be defined', function() {
            expect(ns.router.regexps).to.be.an('object');
        });
    });

    describe('init+compile', function() {

        beforeEach(function() {
            ns.router.routes = [
                '/', '-> /inbox',
                '/inbox', 'messages',
                '/message/{mid:int}', 'message'
            ];

            ns.router.init();
        });

        afterEach(function() {
            ns.router.routes = [];
        });

        it('/ regexp check', function(){
            expect(ns.router.routes[0].regexp.toString()).to.be('/^\/?(?:\\?(.*))?$/')
        });

        it('/ redirect check', function(){
            expect(ns.router.routes[0].redirect).to.be.eql('/inbox')
        });

        it('/inbox regexp check', function(){
            expect(ns.router.routes[1].regexp.toString()).to.be('/^\/inbox\/?(?:\\?(.*))?$/')
        });

        it('/inbox tokens check', function(){
            expect(ns.router.routes[1].tokens).to.be.eql([])
        });

        it('/message/{mid:int} regexp check', function(){
            expect(ns.router.routes[2].regexp.toString()).to.be('/^/message/([0-9]+)/?(?:\\?(.*))?$/')
        });

        it('/message/{mid:int} tokens check', function(){
            expect(ns.router.routes[2].tokens).to.be.eql(['mid'])
        });

    });
});
