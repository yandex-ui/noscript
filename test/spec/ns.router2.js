function extractRegExp(r) {
    return {
        source: r.source,
        global: r.global,
        multiline: r.multiline,
        ignoreCase: r.ignoreCase
    };
}

function compareRegExp(a, b) {
    expect(extractRegExp(a)).to.be.eql(extractRegExp(b));
}

// ----------------------------------------------------------------------------------------------------------------- //

describe('router: new route parsing method', function() {

    describe('parse parameter', function() {
        var _tests = {
            'param': { name: 'param', type: 'id', default_value: undefined, is_optional: false },
            'param=': { name: 'param', type: undefined, default_value: undefined, is_optional: true },
            'param:int': { name: 'param', type: 'int', default_value: undefined, is_optional: false },
            'param=:int': { name: 'param', type: 'int', default_value: undefined, is_optional: true },
            'param=value': { name: 'param', type: undefined, default_value: 'value', is_optional: true },
            'param=value:int': { name: 'param', type: 'int', default_value: 'value', is_optional: true }
        };

        for (var test in _tests) {
            it(test, function() {
                expect(ns.router._parseParam(test)).to.be.eql(_tests[test]);
            });
        }
    });

    describe('generate parameter regexp', function() {
        var _tests = {
            'param': '(.+)',
            'param=': '(?:(.+))?',
            'param:int': '([0-9]+)',
            'param=:int': '(?:([0-9]+))?',
            'param=value': '([0-9]+)',
            'param=value:int': '(?:([0-9]+))?'
        };

        for (var test in _tests) {
            it(test, function() {
                expect( ns.router._generateParamRegexp( ns.router._parseParam(test) )).to.be(_tests[test] );
            });
        }

        it('should throw error for unknown parameter type', function() {
            expect(function() { ns.router._generateParamRegexp(ns.router._parseParam('param:new-type')); }).to.throwError(/\[ns\.router\] Could not find regexp for 'new\-type'!/);
        });
    });

    describe('parse section', function() {
        var _tests = {
            'static': { is_optional: false, items: [ { default_value: 'static' } ]  },
            '{param}': { is_optional: false, items: [ { name: 'param', type: 'id', default_value: undefined, is_optional: false } ] },
            '{param=}': { is_optional: true, items: [ { name: 'param', type: 'id', default_value: '', is_optional: true } ] },
            '{param:int}': { is_optional: false, items: [ { name: 'param', type: 'int', default_value: undefined, is_optional: false } ] },
            '{param=:int}': { is_optional: true, items: [ { name: 'param', type: 'int', default_value: '', is_optional: true } ] },
            '{param=value}': { is_optional: true, items: [ { name: 'param', type: 'id', default_value: 'value', is_optional: true } ] },
            '{param=value:int}': { is_optional: true, items: [ { name: 'param', type: 'int', default_value: 'value', is_optional: true } ] },
            'prefix-{param:int}': { is_optional: false, items: [ { default_value: 'prefix-' }, { name: 'param', type: 'int', default_value: undefined, is_optional: false } ] },
            'prefix-{part1:int}{part2=}': {
                is_optional: false,
                items: [
                    { default_value: 'prefix-' },
                    { name: 'part1', type: 'int', default_value: undefined, is_optional: false },
                    { name: 'part2', type: 'id', default_value: '', is_optional: true },
                ]
            },
        };

        for (var test in _tests) {
            it(test, function() {
                expect(ns.router._parseSection(test)).to.be.eql(_tests[test]);
            });
        }
    });

    describe('generate section regexp', function() {
        var _tests = {
            '{param}': '/(.+)',
            '{param:int}': '/([0-9]+)',
            '{param=value:int}': '(?:/(?!/)(?:([0-9]+))?)?'
        };

        for (var test in _tests) {
            it(test, function() {
                expect( ns.router._generateSectionRegexp( ns.router._parseSection(test) )).to.be(_tests[test] );
            });
        }
    });

    describe('complex url 1', function() {
        it('/{context=contest}/{contest-id:int}/users/{author-login}/album/', function() {
            var route = '/{context=contest}/{contest-id:int}/users/{author-login}/album/';
            var regexp = ns.router.compile(route).regexp;
            compareRegExp( regexp, new RegExp('^(?:/(?!/)(?:([A-Za-z_][A-Za-z0-9_-]*))?)?/([0-9]+)/users/([A-Za-z_][A-Za-z0-9_-]*)/album/?(?:\\?(.*))?$') );
        });
    });

    describe('complex url 2', function() {
        it('/{context=}/users/{login}/view/{id:int}', function() {
            var route = '/{context=}/users/{login}/view/{id:int}';
            var regexp = ns.router.compile(route).regexp;
            compareRegExp( regexp, new RegExp('^(?:/(?!/)(?:([A-Za-z_][A-Za-z0-9_-]*))?)?/users/([A-Za-z_][A-Za-z0-9_-]*)/view/([0-9]+)/?(?:\\?(.*))?$') );
        });
    });

    describe('complex url 3', function() {
        it('/message/{id=:int}', function() {
            var route = '/message/{id=:int}';
            var regexp = ns.router.compile(route).regexp;
            compareRegExp( regexp, new RegExp('^/message(?:/(?!/)(?:([0-9]+))?)?/?(?:\\?(.*))?$') ); // TODO проверить, что не получится 2 слеша на конце
        });
    });

    describe('ns.router.generateUrl()', function() {
        beforeEach(function() {
            ns.router.routes = {
                route: {
                    '/test/{id}': 'test'
                }
            };
            ns.router.init();
        });

        afterEach(function() {
            ns.router.baseDir = '';
            ns.router.undefine();
        });

        it('should throw error for unknown route', function() {
            expect(function() { ns.router.generateUrl('test-no-such-route', {});  }).to.throwError(/\[ns\.router\] Could not find route with id 'test-no-such-route'!/);
        });

        it('should throw error when not enough params', function() {
            expect(function() { ns.router.generateUrl('test', {});  }).to.throwError(/\[ns\.router\] Could not generate url for layout id 'test'!/);
        });
    });

    // describe('ns.router.compare()', function() {
    //     // does not throw exceptoin when cannot generate url
    //     // ignore query

    // })

});
