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

    beforeEach(function() {
        ns.router.init();
    });

    afterEach(function() {
        delete ns.router._routes;
        delete ns.router.routes;
    });

    describe('parse parameter', function() {
        var _tests = {
            'param':            { name: 'param', type: 'id', default_value: undefined, is_optional: false },
            'param=':           { name: 'param', type: 'id', default_value: '', is_optional: true },
            'param:int':        { name: 'param', type: 'int', default_value: undefined, is_optional: false },
            'param=:int':       { name: 'param', type: 'int', default_value: '', is_optional: true },
            'param=value':      { name: 'param', type: 'id', default_value: 'value', is_optional: true },
            'param=value:int':  { name: 'param', type: 'int', default_value: 'value', is_optional: true },
            'param==':          { throw: /^\[ns\.router\] Parameter 'param' value must be specified$/ },
            'param==:int':      { throw: /^\[ns\.router\] Parameter 'param' value must be specified$/ },
            'param==value':     { name: 'param', type: 'id', default_value: 'value', is_optional: false },
            'param==value:int': { throw: /^\[ns\.router\] Wrong value for 'param' parameter$/ },
            'param==123:int':   { name: 'param', type: 'int', default_value: '123', is_optional: false }
        };

        for (var test in _tests) {
            (function(test) {
                it(test, function() {
                    var result = _tests[test];
                    if (result.throw) {
                        expect(function() { ns.router._parseParam(test); }).to.throwError(result.throw);
                    } else {
                        expect(ns.router._parseParam(test)).to.be.eql(result);
                    }
                });
            })(test);
        }
    });

    describe('parameter validation', function() {
        var _tests = [
            { value: 123, type: 'int', result: true },
            { value: '123', type: 'int', result: true },
            { value: 'a123', type: 'int', result: false },
            { value: '123a', type: 'int', result: false }
        ];

        for (var i = 0; i < _tests.length; i++) {
            (function(test) {
                var name = '' + test.value + ' (' + typeof (test.value) + ') ' + (test.result ? 'is' : 'is not') + ' ' + test.type;
                it(name, function() {
                    expect(ns.router._isParamValid(test.value, test.type)).to.be(test.result);
                });
            })(_tests[i]);
        }
    });

    describe('generate parameter regexp', function() {
        // 'id': '[A-Za-z_][A-Za-z0-9_-]*',
        // 'int': '[0-9]+'

        var _tests = {
            'param':                 '([A-Za-z_][A-Za-z0-9_-]*)',
            'param=':                '(?:([A-Za-z_][A-Za-z0-9_-]*))?',
            'param:int':             '([0-9]+)',
            'param=:int':            '(?:([0-9]+))?',
            'param=value':           '(?:([A-Za-z_][A-Za-z0-9_-]*))?',
            'param=value:int':       '(?:([0-9]+))?',
            'param:new-type':        { throw: /^\[ns\.router\] Could not find regexp for type 'new\-type'!$/ },
            'param==value':          '(value)',
            'param==123:int':        '(123)',
            'param==value:int':      { throw: /^\[ns\.router\] Wrong value for 'param' parameter$/ },
            'param==value:new-type': { throw: /^\[ns\.router\] Could not find regexp for type 'new\-type'!$/ },
        };

        for (var test in _tests) {
            (function(test) {
                it(test, function() {
                    var result = _tests[test];
                    if (result.throw) {
                        expect(function() { ns.router._generateParamRegexp(ns.router._parseParam(test)); }).to.throwError(result.throw);
                    } else {
                        expect(ns.router._generateParamRegexp(ns.router._parseParam(test))).to.be.eql(result);
                    }
                });
            })(test);
        }
    });

    describe('parse section', function() {
        var _tests = {
            'static':                     { is_optional: false, items: [ { default_value: 'static' } ]  },
            '{param}':                    { is_optional: false, items: [ { name: 'param', type: 'id', default_value: undefined, is_optional: false } ] },
            '{param=}':                   { is_optional: true, items: [ { name: 'param', type: 'id', default_value: '', is_optional: true } ] },
            '{param:int}':                { is_optional: false, items: [ { name: 'param', type: 'int', default_value: undefined, is_optional: false } ] },
            '{param=:int}':               { is_optional: true, items: [ { name: 'param', type: 'int', default_value: '', is_optional: true } ] },
            '{param=value}':              { is_optional: true, items: [ { name: 'param', type: 'id', default_value: 'value', is_optional: true } ] },
            '{param=value:int}':          { is_optional: true, items: [ { name: 'param', type: 'int', default_value: 'value', is_optional: true } ] },
            '{param==value:int}':         { throw: /^\[ns\.router\] Wrong value for 'param' parameter$/ },
            '{param==123:int}':           { is_optional: false, items: [ { name: 'param', type: 'int', default_value: '123', is_optional: false } ] },
            'prefix-{param:int}':         { is_optional: false, items: [ { default_value: 'prefix-' }, { name: 'param', type: 'int', default_value: undefined, is_optional: false } ] },
            'prefix-{part1:int}{part2=}': {
                is_optional: false,
                items: [
                    { default_value: 'prefix-' },
                    { name: 'part1', type: 'int', default_value: undefined, is_optional: false },
                    { name: 'part2', type: 'id', default_value: '', is_optional: true },
                ]
            },
            'some{thing': { throw: /^\[ns\.router\] could not parse parameter in url section: some{thing$/ }
        };

        for (var test in _tests) {
            (function(test) {
                it(test, function() {
                    var result = _tests[test];
                    if (result.throw) {
                        expect(function() { ns.router._parseSection(test); }).to.throwError(result);
                    } else {
                        expect(ns.router._parseSection(test)).to.be.eql(result);
                    }
                });
            })(test);
        }
    });

    describe('generate section regexp', function() {
        var _tests = {
            '{param}':            '/([A-Za-z_][A-Za-z0-9_-]*)',
            '{param:int}':        '/([0-9]+)',
            '{param=value:int}':  '(?:/(?!/)(?:([0-9]+))?)?',
            '{param==value}':     '/(value)',
            '{param==123:int}':   '/(123)'
        };

        for (var test in _tests) {
            (function(test) {
                it(test, function() {
                    expect( ns.router._generateSectionRegexp( ns.router._parseSection(test) )).to.be(_tests[test] );
                });
            })(test);
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
                    '/{context==search}/{query}/image/{id:int}': 'view',
                    '/{context==tag}/{tag}/image/{id:int}': 'view',
                    '/{context==top}/image/{id:int}': 'view',
                    '/{context}/image/{id:int}': 'view',
                    '/test/{id}': 'test'
                }
            };
            ns.router.init();
        });

        afterEach(function() {
            ns.router.undefine();
        });

        var _tests = [
            {
                name: 'should throw error for unknown route',
                id: 'test-no-such-route',
                params: {},
                result: { throw: /^\[ns\.router\] Could not find route with id 'test-no-such-route'!$/ }
            },
            {
                name: 'should throw error when not enough params',
                id: 'test',
                params: {},
                result: { throw: /^\[ns\.router\] Could not generate url for layout id 'test'!$/ }
            },
            {
                name: 'generate route for parameter with filter 1',
                id: 'view',
                params: { context: 'top', id: 1 },
                result: '/top/image/1'
            },
            {
                name: 'generate route for parameter with filter 2',
                id: 'view',
                params: { context: 'search', query: 'airport', id: 2 },
                result: '/search/airport/image/2'
            },
            {
                name: 'generate route for parameter with filter 3',
                id: 'view',
                params: { context: 'tag', tag: 'summer', id: 3 },
                result: '/tag/summer/image/3'
            },
            {
                name: 'generate route for parameter with filter 4',
                id: 'view',
                params: { context: 'new-context', id: 4 },
                result: '/new-context/image/4'
            }
        ];

        for (var i = 0; i < _tests.length; i++) {
            (function(test) {
                it(test.name, function() {
                    if (test.result.throw) {
                        expect(function() { ns.router.generateUrl(test.id, test.params); }).to.throwError(test.result.throw);
                    } else {
                        expect(ns.router.generateUrl(test.id, test.params)).to.be.eql(test.result);
                    }
                });
            })(_tests[i]);
        }
    });

    // describe('ns.router.compare()', function() {
    //     // does not throw exceptoin when cannot generate url
    //     // ignore query

    // })

});
