describe('ns.parseQuery', function() {

    var tests = {
        'a=1': {a: '1'},
        'a=1&b=2': {a: '1', b: '2'},
        'a=1&b=2&': {a: '1', b: '2'},
        'a=1&b=2&c': {a: '1', b: '2', c: ''},
        'a=1&b=2&c=': {a: '1', b: '2', c: ''},
        'a=%3D': {a: '='},
        'a=%3': {a: ''}
    };

    for (var testString in tests) {
        var expectedResult = tests[testString];

        (function(testString, expectedResult) {

            it('should parse "' + testString + '" as ' + JSON.stringify(expectedResult), function() {
                var actualResult = ns.parseQuery(testString);
                expect(actualResult).to.be.eql(expectedResult)
            });

        })(testString, expectedResult);
    }

});
