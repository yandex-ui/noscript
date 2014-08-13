describe('no.action', function() {

    describe('getParams', function() {

        it('should return empty object if no attribute "data-params" exists', function() {
            var node = document.createElement('div');
            var params = ns.action.getParams(node);
            expect(params).to.be.eql({});
        });

        it('should return empty object if attribute "data-params" is not JSON', function() {
            var node = document.createElement('div');
            node.setAttribute('data-params', 'v');
            var params = ns.action.getParams(node);
            expect(params).to.be.eql({});
        });

        it('should return empty object if attribute "data-params" is not valid JSON', function() {
            var node = document.createElement('div');
            node.setAttribute('data-params', "{'bar': 'foo'}");
            var params = ns.action.getParams(node);
            expect(params).to.be.eql({});
        });

        it('should return object from attribute "data-params" if it is valid JSON', function() {
            var node = document.createElement('div');
            node.setAttribute('data-params', '{"bar": "foo"}');
            var params = ns.action.getParams(node);
            expect(params).to.be.eql({'bar': 'foo'});
        });

    });

    describe('run', function() {

        it('должен выполнить обработчик action', function() {
            var handler = this.sinon.spy();
            ns.action.define('test', handler);
            ns.action.run('test');

            expect(handler).to.have.callCount(1);
        });

        it('должен бросить исключение, если action не определен', function() {
            var fn = function() {
                ns.action.run('test');
            };
            expect(fn).to.throw();
        });

    })
});
