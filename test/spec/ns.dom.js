describe('ns.dom.js', function() {

    describe('ns.childrenIterator', function() {

        beforeEach(function() {
            this.node1 = document.createElement('p');
            this.node2 = document.createElement('p');

            this.node = document.createElement('div');

            this.node.appendChild(this.node1);
            this.node.appendChild(this.node2);
        });

        it('первый вызов должен вернуть первую ноду', function() {
            var iterator = ns.childrenIterator(this.node);

            expect(iterator.getNext()).to.be.equal(this.node1);
        });

        it('второй вызов должен вернуть вторую ноду', function() {
            var iterator = ns.childrenIterator(this.node);
            iterator.getNext();

            expect(iterator.getNext()).to.be.equal(this.node2);
        });

        it('третий вызов должен вернуть null', function() {
            var iterator = ns.childrenIterator(this.node);
            iterator.getNext();
            iterator.getNext();

            expect(iterator.getNext()).to.be.equal(null);
        });

    });

});
