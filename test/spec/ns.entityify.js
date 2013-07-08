describe('ns.entityify', function() {

    describe('ns.entityify', function() {

        var tests = [
            {'in': '<', out: '&lt;'},
            {'in': '<<', 'out': '&lt;&lt;'},

            {'in': '>', 'out': '&gt;'},
            {'in': '>>', 'out': '&gt;&gt;'},

            {'in': '"', 'out': '&quot;'},
            {'in': '""', 'out': '&quot;&quot;'},

            {'in': '<>"', 'out': '&lt;&gt;&quot;'},

            {'in': 1, 'out': '1'}
        ];

        tests.forEach(function(test) {

            it('should process "' + test['in'] + '" as ' + test.out, function() {
                var actualResult = ns.entityify(test['in']);
                expect(test.out).to.be.eql(actualResult);
            });

        });

    });

});
