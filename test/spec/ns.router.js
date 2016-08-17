describe('ns.router', function() {

    describe('API', function() {

        it('should be defined', function() {
            expect(ns.router).to.be.a('function');
        });

        it('ns.router.init should be defined', function() {
            expect(ns.router.init).to.be.a('function');
        });

        it('ns.router.regexps should be defined', function() {
            expect(ns.router.regexps).to.be.an('object');
        });
    });

    describe('routes', function() {

        beforeEach(function() {
            ns.router.routes = {
                redirect: {
                    '/': '/inbox',
                    '/inbox/old/{int:int}': '/inbox',
                    '/inbox/my': function() {
                        return '/inbox';
                    },
                    '/inbox/my/1': function() {
                        return '/landing';
                    },
                    '/inbox/my/{int:int}': function(params) {
                        return '/inbox/' + params.int;
                    }
                },
                route: {
                    '/inbox': 'messages',
                    '/message/{mid:int}': 'message',
                    '/page/prefix{page:int}': 'url-with-prefix',
                    '/search/{request:any}': 'search'
                }
            };

            ns.router.regexps['any'] = '.+?';

            ns.router.init();
        });

        afterEach(function() {
            delete ns.router.regexps['any'];
        });

        var test_route = function(url, params, test_name) {
            test_name = test_name || (url + ' -> ' + params.page);
            it(test_name, function() {
                expect(ns.router(url)).to.be.eql(params);
            });
        };

        test_route('', {page: ns.R.REDIRECT, params: {}, redirect: '/inbox'});
        test_route('/', {page: ns.R.REDIRECT, params: {}, redirect: '/inbox'});
        test_route('/inbox/old/123', {page: ns.R.REDIRECT, params: {}, redirect: '/inbox'});
        test_route('/inbox/my', {page: ns.R.REDIRECT, params: {}, redirect: '/inbox'});
        test_route('/inbox/my/1', {page: ns.R.REDIRECT, params: {}, redirect: '/landing'});
        test_route('/inbox/my/123', {page: ns.R.REDIRECT, params: {}, redirect: '/inbox/123'});
        test_route('/?foo=bar', {page: ns.R.REDIRECT, params: {}, redirect: '/inbox'});
        test_route('/inbox', {page: 'messages', params: {}});
        test_route('/inbox/', {page: 'messages', params: {}});

        test_route('/message', {page: ns.R.NOT_FOUND, params: {}});
        test_route('/message/', {page: ns.R.NOT_FOUND, params: {}});

        test_route('/message/12345', {page: 'message', params: {mid: '12345'}});
        test_route('/message/12345/', {page: 'message', params: {mid: '12345'}});

        test_route('/page/prefix1/', {page: 'url-with-prefix', params: {page: '1'}});

        test_route('/search/request/', {page: 'search', params: {request: 'request'}});
        test_route('/search/' + encodeURIComponent('/') + '/', {page: 'search', params: {request: '/'}});
        // test for invalid urlencode
        test_route('/search/' + encodeURIComponent('/') + '%F/', {page: 'search', params: {request: undefined}});
    });

    describe('default value', function() {

        beforeEach(function() {
            ns.router.regexps[ 'page' ] = 'folder|home';
            ns.router.routes = {
                route: {
                    '/messages/{folder:id=inbox}/{message_id:int}': 'message',
                    '/folder/{folder:id=inbox}': 'folder',
                    '/{page:page=home}': 'page'
                }
            };
            ns.router.init();
        });

        var test_route = function(url, page, params, test_name) {
            it(test_name || url, function() {
                expect(ns.router(url)).to.be.eql({ page: page, params: params });
            });
        };

        test_route('/folder/',        'folder', { folder: 'inbox' });
        test_route('/folder/inbox',   'folder', { folder: 'inbox' });
        test_route('/folder/starred', 'folder', { folder: 'starred' });
        test_route('/folder',         'folder', { folder: 'inbox' }, '/folder : slash near param with default value can collapse');

        test_route('/', 'page', { page: 'home' }, '/ resolved to default value of a custom type');

        test_route('/messages/inbox/45?var1=val1&var2=val2', 'message', { folder: 'inbox', message_id: '45', var1: 'val1', var2: 'val2' });
        //FIXME
        //test_route('/messages/inbox/45?var1=val1&',           'message', { folder: 'inbox', message_id: '45', var1: 'val1' });
        test_route('/messages/inbox/45?var1=val1',           'message', { folder: 'inbox', message_id: '45', var1: 'val1' });
        //  NOTE может надо какое-то другое значение для val1 ?
        test_route('/messages/inbox/45?val1',                'message', { folder: 'inbox', message_id: '45', val1: '' });
        test_route('/messages/inbox/45?',                    'message', { folder: 'inbox', message_id: '45' });
        test_route('/messages/inbox/45',                     'message', { folder: 'inbox', message_id: '45' });

        test_route('/messages/45?var1=val1&var2=val2', 'message', { folder: 'inbox', message_id: '45', var1: 'val1', var2: 'val2' });
        test_route('/messages/45?var1=val1',           'message', { folder: 'inbox', message_id: '45', var1: 'val1' });
        test_route('/messages/45?val1',                'message', { folder: 'inbox', message_id: '45', val1: '' });
        test_route('/messages/45?',                    'message', { folder: 'inbox', message_id: '45' });
        test_route('/messages/45',                     'message', { folder: 'inbox', message_id: '45' });

        // fail
        test_route('/messages//45?var1=val1&var2=val2', 'not-found', {}, '/messages//45?var1=val1&var2=val2: MUST FAIL');
        test_route('/messages//45?var1=val1',           'not-found', {}, '/messages//45?var1=val1: MUST FAIL');
        test_route('/messages//45?val1',                'not-found', {}, '/messages//45?val1: MUST FAIL');
        test_route('/messages//45?',                    'not-found', {}, '/messages//45?: MUST FAIL');
        test_route('/messages//45',                     'not-found', {}, '/messages//45: MUST FAIL');
    });

    describe('filter value', function() {

        beforeEach(function() {
            ns.router.regexps['context'] = 'search|tag|top';
            ns.router.routes = {
                route: {
                    '/{context:context==search}/{query}/image/{id:int}': 'view',
                    '/{context:context==tag}/{tag}/image/{id:int}': 'view',
                    '/{context:context=}/image/{id:int}': 'view'
                }
            };
            ns.router.init();
        });

        var test_route = function(url, page, params, test_name) {
            it(test_name || url, function() {
                expect(ns.router(url)).to.be.eql({ page: page, params: params });
            });
        };

        test_route('/search/airport/image/1', 'view', { context: 'search', query: 'airport', id: '1' });
        test_route('/tag/airport/image/2',    'view', { context: 'tag', tag: 'airport', id: '2' });
        test_route('/top/image/3',            'view', { context: 'top', id: '3' });
    });

    describe('baseDir: routing', function() {
        beforeEach(function() {
            ns.router.baseDir = '/ver2';
            ns.router.routes = {
                route: {
                    '/index': 'index'
                }
            };
            ns.router.init();
        });

        afterEach(function() {
            delete ns.router._routes;
            delete ns.router.routes;
            ns.router.baseDir= '';
        });

        it('NOT_APP_URL in case url does not match baseDir', function() {
            expect(ns.router('/ver1/index')).to.eql({
                page: ns.R.NOT_APP_URL,
                params: {},
                redirect: '/ver1/index'
            });
        });

        it('NOT_APP_URL in case url does not match baseDir but match route', function() {
            expect(ns.router('/index')).to.eql({
                page: ns.R.NOT_APP_URL,
                params: {},
                redirect: '/index'
            });
        });

        it('prefixed url is routed fine', function() {
            expect(ns.router('/ver2/index')).to.be.eql({ page: 'index', params: {} });
        });
    });

    describe('baseDir: url generate with baseDir', function() {
        beforeEach(function() {
            ns.router.baseDir = '/ver2';
            ns.router.routes = {};
            ns.router.init();
        });

        afterEach(function() {
            delete ns.router._routes;
            delete ns.router.routes;
            ns.router.baseDir= '';
        });

        // URL GENERATION
        it('generate prefixed url when baseDir is not empty', function() {
            expect(ns.router.url('/index')).to.be.eql('/ver2/index');
        });
    });

    describe('baseDir: url generate without baseDir', function() {
        beforeEach(function() {
            ns.router.routes = {};
            ns.router.init();
        });

        afterEach(function() {
            delete ns.router._routes;
            delete ns.router.routes;
            ns.router.baseDir= '';
        });

        it('generate unprefixed url when baseDir is empty', function() {
            expect(ns.router.url('/index')).to.be.eql('/index');
        });
    });

    describe('rewrite', function() {

        beforeEach(function() {
            ns.router.routes = {
                rewriteUrl: {
                    '/page1': '/page/1'
                },
                route: {
                    '/page/{id:int}': 'layout'
                }
            };
            ns.router.init();
        });

        var tests = [
            {
                'url': '/page1',
                'route': {
                    'page': 'layout',
                    'params': {
                        'id': '1'
                    }
                }
            },

            {
                'url': '/page1?foo=bar',
                'route': {
                    'page': 'layout',
                    'params': {
                        'id': '1',
                        'foo': 'bar'
                    }
                }
            }
        ];

        tests.forEach(function(test) {

            it('should process "' + test.url + '" as "' + JSON.stringify(test.route) + '"', function() {
                expect(ns.router(test.url)).to.be.eql(test.route);
            });

        });

    });

    describe('special case: parameter is a path', function() {

        beforeEach(function() {
            ns.router.regexps.path = '(?:\\/[^\\/\\?]+)+';
            ns.router.regexps.dialog = 'copy|move';
            ns.router.regexps.divider = '\\|';

            ns.router.routes = {
                route: {
                    '/from{from-path:path}/{dialog:dialog}{div:divider}{to-path:path}': 'page',
                    '/from{from-path:path}/{dialog:dialog}{div:divider}': 'page',
                    '/from{from-path:path}/{dialog:dialog}': 'page',
                    '/from{from-path:path}': 'page'
                }
            };
            ns.router.init();
        });

        var test_route = function(url, params, test_name) {
            test_name = test_name || (url + ' -> ' + params.page);
            it(test_name, function() {
                expect(ns.router(url)).to.be.eql(params);
            });
        };

        test_route('/from/var/logs/nginx/copy|/users/me/local', { page: 'page', params: { dialog: 'copy', div: '|', 'from-path': '/var/logs/nginx', 'to-path': '/users/me/local' } } );
        test_route('/from/var/logs/nginx/copy|', { page: 'page', params: { dialog: 'copy', div: '|', 'from-path': '/var/logs/nginx' } } );
        test_route('/from/var/logs/nginx/copy', { page: 'page', params: { dialog: 'copy', 'from-path': '/var/logs/nginx' } } );
        test_route('/from/var/logs/nginx', { page: 'page', params: { 'from-path': '/var/logs/nginx' } } );
    });

    describe('encodeParamValue and decodeParamValue', function() {
        beforeEach(function() {
            ns.router.regexps.path = '(?:\\/[^\\/\\?]+)+';

            ns.router.routes = {
                route: {
                    '/from{id:path}': 'page',
                }
            };
            ns.router.init();

            ns.router.encodeParamValue = this.sinon.stub();
            ns.router.decodeParamValue = this.sinon.stub();
        });
        afterEach(function() {
            ns.router.encodeParamValue = encodeURIComponent;
            ns.router.decodeParamValue = decodeURIComponent;
        });

        describe('#encodeParamValue', function() {
            beforeEach(function() {
                ns.router.generateUrl('page', { id: '/hello/world' });
            });

            it('должен принимать в аргументах значение и название параметра', function() {
                expect(ns.router.encodeParamValue.calledWith('/hello/world', 'id')).to.be.true;
            });
        });

        describe('#decodeParamValue', function() {
            beforeEach(function() {
                ns.router('/from/hello/world?foo=bar');
            });

            it('должен принимать в аргументах значение и название параметра', function() {
                expect(ns.router.decodeParamValue.calledWith('/hello/world', 'id')).to.be.true;
            });
        });
    });
});
