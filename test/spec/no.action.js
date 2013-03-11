describe('no.action', function() {

    describe('getParams', function() {

        it('should return empty object if no attribute "data-params" exists', function() {
            var node = document.createElement('div');
            var params = no.action.getParams(node);
            expect(params).to.be.eql({});
        });

        it('should return empty object if attribute "data-params" is not JSON', function() {
            var node = document.createElement('div');
            node.setAttribute('data-params', 'v');
            var params = no.action.getParams(node);
            expect(params).to.be.eql({});
        });

        it('should return empty object if attribute "data-params" is not valid JSON', function() {
            var node = document.createElement('div');
            node.setAttribute('data-params', "{'bar': 'foo'}");
            var params = no.action.getParams(node);
            expect(params).to.be.eql({});
        });

        it('should return object from attribute "data-params" if it is valid JSON', function() {
            var node = document.createElement('div');
            node.setAttribute('data-params', '{"bar": "foo"}');
            var params = no.action.getParams(node);
            expect(params).to.be.eql({'bar': 'foo'});
        });

    });

});
