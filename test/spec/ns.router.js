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

        it('ns.router.regexps should be defined', function() {
            expect(ns.router.regexps).to.be.an('object');
        });
    });

    describe('routes', function() {

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

        var test_route = function(url, params, test_name) {
            test_name = test_name || (url + ' -> ' + params.page);
            it(test_name, function() {
                expect(ns.router(url)).to.be.eql(params);
            });
        };

        test_route('/', {page: ns.R.REDIRECT, params: {}, redirect: '/inbox'});
        test_route('/inbox', {page: 'messages', params: {}});
        test_route('/inbox/', {page: 'messages', params: {}});

        test_route('/message', {page: ns.R.NOT_FOUND, params: {}});
        test_route('/message/', {page: ns.R.NOT_FOUND, params: {}});

        test_route('/message/12345', {page: 'message', params: {mid: '12345'}});
        test_route('/message/12345/', {page: 'message', params: {mid: '12345'}});
    });

    describe('default value', function() {

        beforeEach(function() {
            ns.router.regexps[ 'page' ] = 'folder|home';
            ns.router.routes = {
                route: {
                    '/messages/{folder=inbox:id}/{message_id:int}': 'message',
                    '/folder/{folder=inbox:id}': 'folder',
                    '/{page=home:page}': 'page'
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
});
