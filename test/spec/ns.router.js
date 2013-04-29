describe('ns.router', function() {

    afterEach(function() {
        delete ns.router.routes;
    });

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
        });

        it('/ redirect check', function() {
            expect(ns.router._routes.redirect['/']).to.be.eql('/inbox');
        });

        it('/inbox regexp check', function() {
            expect(ns.router._routes.route[0].regexp.toString()).to.be('/^\/inbox\/?(?:\\?(.*))?$/');
        });

        it('/inbox tokens check', function() {
            expect(ns.router._routes.route[0].tokens).to.be.eql([]);
        });

        it('/message/{mid:int} regexp check', function() {
            expect(ns.router._routes.route[1].regexp.toString()).to.be('/^/message/([0-9]+)/?(?:\\?(.*))?$/');
        });

        it('/message/{mid:int} tokens check', function() {
            expect(ns.router._routes.route[1].tokens).to.be.eql(['mid']);
        });

    });

    describe('default value', function() {

        beforeEach(function() {
            ns.router.regexps[ 'page' ] = 'folder|home';
            ns.router.routes = {
                route: {
                    '/messages/{folder=inbox:id}': 'folder',
                    '/{page=home:page}': 'page'
                }
            };
            ns.router.init();
        });

        it('/messages : does not match because of the last slash', function() {
            expect(ns.router('/messages')).to.be.eql({ page: 'not-found', params: {} });
        });

        it('/messages/', function() {
            expect(ns.router('/messages/')).to.be.eql({ page: 'folder', params: { folder: 'inbox' } });
        });

        it('/messages/inbox', function() {
            expect(ns.router('/messages/inbox')).to.be.eql({ page: 'folder', params: { folder: 'inbox' } });
        });

        it('/messages/starred', function() {
            expect(ns.router('/messages/starred')).to.be.eql({ page: 'folder', params: { folder: 'starred' } });
        });

        it('/ resolved to default value of a custom type', function() {
            expect(ns.router('/')).to.be.eql({ page: 'page', params: { page: 'home' } });
        });

    });
});
