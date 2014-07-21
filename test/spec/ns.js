describe('ns.js', function() {

    describe('ns.parseQuery', function() {

        var tests = {
            'a=1': {a: '1'},
            'a=1&b=2': {a: '1', b: '2'},
            'a=1&b=2&': {a: '1', b: '2'},
            'a=1&b=2&c': {a: '1', b: '2', c: ''},
            'a=1&b=2&c=': {a: '1', b: '2', c: ''},
            'a=1&b=2&c=foo=bar': {a: '1', b: '2', c: 'foo=bar'},
            'a=%3D': {a: '='},
            'a=%3': {a: ''}
        };

        for (var testString in tests) {
            var expectedResult = tests[testString];

            (function(testString, expectedResult) {

                it('should parse "' + testString + '" as ' + JSON.stringify(expectedResult), function() {
                    var actualResult = ns.parseQuery(testString);
                    expect(actualResult).to.be.eql(expectedResult);
                });

            })(testString, expectedResult);
        }

    });

    describe('ns.assert', function() {
        it('should be ok', function() {
            expect(function() { ns.assert(true, '', '');  }).to.not.throw();
        });
        it('should throw error', function() {
            expect(function() { ns.assert(false, 'context', 'message');  }).to.throw(/\[context\] message/);
        });
        it('should throw error with params', function() {
            expect(function() { ns.assert(false, 'context', 'error code %s', 7);  }).to.throw(/\[context\] error code 7/);
        });
    });

    describe('ns.assert.fail', function() {
        it('should throw error', function() {
            expect(function() { ns.assert.fail('context', 'message');  }).to.throw(/\[context\] message/);
        });
        it('should throw error with params', function() {
            expect(function() { ns.assert.fail('context', 'error code %s', 7);  }).to.throw(/\[context\] error code 7/);
        });
    });

});

