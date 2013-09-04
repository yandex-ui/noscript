function extractRegExp(r) {
    return {
        source: r.source,
        global: r.global,
        multiline: r.multiline,
        ignoreCase: r.ignoreCase
    };
};

function compareRegExp(a, b) {
    expect(extractRegExp(a)).to.be.eql(extractRegExp(b));
}

// ----------------------------------------------------------------------------------------------------------------- //

describe('router: new route parsing method', function() {

    describe('parse parameters', function() {
        var _tests = {
            'static': { default_value: 'static' },
            '{param}': { name: 'param', type: undefined, default_value: undefined, is_optional: false },
            '{param=}': { name: 'param', type: undefined, default_value: undefined, is_optional: true },
            '{param:int}': { name: 'param', type: 'int', default_value: undefined, is_optional: false },
            '{param=:int}': { name: 'param', type: 'int', default_value: undefined, is_optional: true },
            '{param=value}': { name: 'param', type: undefined, default_value: 'value', is_optional: true },
            '{param=value:int}': { name: 'param', type: 'int', default_value: 'value', is_optional: true }
        };

        for (var test in _tests) {
            it(test, function() {
                expect(ns.router.__parseParam(test)).to.be.eql(_tests[test]);
            });
        }
    });

    describe('generate parameter regexp', function() {
        var _tests = {
            'static': '/static',
            '{param}': '/(.+)',
            '{param=}': '(?:/(.+))?',
            '{param:int}': '/([0-9]+)',
            '{param=:int}': '(?:/([0-9]+))?',
            '{param=value}': '/([0-9]+)',
            '{param=value:int}': '(?:/([0-9]+))?'
        };

        for (var test in _tests) {
            it(test, function() {
                expect( ns.router.__generateParamRegexp( ns.router.__parseParam(test) )).to.be(_tests[test] );
            });
        }
    });

    describe('complex url 1', function() {
        it('/{context=contest}/{contest-id:int}/users/{author-login}/album/', function() {
            var route = '/{context=contest}/{contest-id:int}/users/{author-login}/album/';
            var regexp = ns.router.compile(route).regexp;
            compareRegExp( regexp, new RegExp('^(?:/([A-Za-z_][A-Za-z0-9_-]*))?/([0-9]+)/users/([A-Za-z_][A-Za-z0-9_-]*)/album/?(?:\\?(.*))?$') );
        });
    });

    describe('complex url 2', function() {
        it('/{context=}/users/{login}/view/{id:int}', function() {
            var route = '/{context=}/users/{login}/view/{id:int}';
            var regexp = ns.router.compile(route).regexp;
            compareRegExp( regexp, new RegExp('^(?:/([A-Za-z_][A-Za-z0-9_-]*))?/users/([A-Za-z_][A-Za-z0-9_-]*)/view/([0-9]+)/?(?:\\?(.*))?$') );
        });
    });

    describe('complex url 3', function() {
        it('/message/{id=:int}', function() {
            var route = '/message/{id=:int}';
            var regexp = ns.router.compile(route).regexp;
            compareRegExp( regexp, new RegExp('^/message(?:/([0-9]+))?/?(?:\\?(.*))?$') ); // TODO проверить, что не получится 2 слеша на конце
        });
    });

    describe('double end slash', function() {
        it('is not valid');
    });
});
