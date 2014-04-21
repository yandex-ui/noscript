describe('ns.entityify', function() {

    var commonTests = [
        {'raw': '&', 'entity': '&amp;'},
        {'raw': '&&', 'entity': '&amp;&amp;'},

        {'raw': '<', 'entity': '&lt;'},
        {'raw': '<<', 'entity': '&lt;&lt;'},

        {'raw': '>', 'entity': '&gt;'},
        {'raw': '>>', 'entity': '&gt;&gt;'},

        {'raw': '"', 'entity': '&quot;'},
        {'raw': '""', 'entity': '&quot;&quot;'},

        {'raw': "'", 'entity': '&#x27;'},
        {'raw': "''", 'entity': '&#x27;&#x27;'},

        {'raw': "/", 'entity': '&#x2F;'},
        {'raw': "//", 'entity': '&#x2F;&#x2F;'},

        {'raw': '<>"', 'entity': '&lt;&gt;&quot;'}
    ];

    describe('ns.entityify', function() {

        // copy
        var entityifyTests = [].concat(commonTests);

        entityifyTests.push(
            {'raw': 1, 'entity': '1'}
        );

        entityifyTests.forEach(function(test) {

            it('should process "' + test['raw'] + '" as ' + test['entity'], function() {
                var actualResult = ns.entityify(test['raw']);
                expect(test['entity']).to.be.eql(actualResult);
            });

        });

    });
    
    describe('ns.deentityify', function() {

        // copy
        var deentityifyTests = [].concat(commonTests);

        deentityifyTests.push(
            {'raw': '1', 'entity': '1'}
        );

        deentityifyTests.forEach(function(test) {

            it('should process "' + test['entity'] + '" as ' + test['raw'], function() {
                var actualResult = ns.deentityify(test['entity']);
                expect(test['raw']).to.be.eql(actualResult);
            });

        });

    });

});
