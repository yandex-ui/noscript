describe('no.router', function() {

    describe('API', function() {

        it('should be defined', function() {
            expect(no.router).to.be.a('function');
        });

        it('no.router.init should be defined', function() {
            expect(no.router.init).to.be.a('function');
        });

        it('no.router.routes should be defined', function() {
            expect(no.router.routes).to.be.an('array');
        });

        it('no.router.regexps should be defined', function() {
            expect(no.router.regexps).to.be.an('object');
        });
    });

    describe('init+compile', function() {

        beforeEach(function() {
            no.router.routes = [
                '/inbox', 'messages',
                '/message/{mid:int}', 'message'
            ];

            no.router.init();
        });

        afterEach(function() {
            no.router.routes = [];
        });

        it('/inbox regexp check', function(){
            expect(no.router.routes[0].regexp.toString()).to.be('/^\/inbox\/?(?:\\?(.*))?$/')
        });

        it('/inbox tokens check', function(){
            expect(no.router.routes[0].tokens).to.be.eql([])
        });

        it('/message/{mid:int} regexp check', function(){
            expect(no.router.routes[1].regexp.toString()).to.be('/^/message/([0-9]+)/?(?:\\?(.*))?$/')
        });

        it('/message/{mid:int} tokens check', function(){
            expect(no.router.routes[1].tokens).to.be.eql(['mid'])
        });

    });
});
