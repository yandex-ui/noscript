/// Layout

ns.layout.define('app', {
    'app': {
        'content@': {}
    }
});

ns.layout.define('photo', {
    'app content@': {
        'photo': {
            'photo-left@': {
                'photo-image&': true
            },
            'bottom-left@': {
                'photo-below': {
                    'comments@': {
                        'photo-comments&': true
                    }
                }
            }
        }
    }
}, 'app');

/// Models

ns.Model.define('photo');
ns.Model.define('comments');

/// Views

ns.View.define('app');
ns.View.define('photo', { models: [] });
ns.View.define('photo-image', { models: [ 'photo' ] });
ns.View.define('photo-below', { models: [ 'photo' ] });
ns.View.define('photo-comments', { models: [ 'comments' ] });

/// Routes

ns.router.routes = {
    route: {
        '/': 'photo'
    }
};

/// Mock server

var server_mock_data = {
    '/models/?_m=photo': '{ "models": [ { "data": {} } ] }',
    '/models/?_m=comments': '{ "models": [ { "data": {} } ] }'
};

// ----------------------------------------------------------------------------------------------------------------- //

describe('ns.View._updateHTML иногда обновлял ноду, но не добавлял её в DOM', function() {

    // Fake XHR and backend.
    beforeEach(function() {
        var server = this.server = sinon.fakeServer.create();
        server.autoRespond = true;

        server.respondWith(function(xhr) {
            var response = server_mock_data[xhr.url];
            console.log(xhr.url);
            if (response) {
                xhr.respond(200, { "Content-Type": "application/json" }, response);
            } else {
                xhr.respond(400);
            }
        });
    });

    // Restore XHR.
    afterEach(function() {
        this.server.restore();
    });

    it('All temp nodes are replaced with real', function(done) {
        var that = this;

        // noscript init
        // NOTE the same as ns.init() but not listening to popstate
        ns.action.init();
        ns.router.init();
        ns.initMainView();

        var promise = ns.page.go('/');
        promise.then(function() {
            // NOTE у нас нет ссылки на второй promise для async view. Приходится извращаться.
            setTimeout(function() {
                expect($('.will-be-replaced').length).to.be(0);
                done();
            }, 100);
        });

    });
});
