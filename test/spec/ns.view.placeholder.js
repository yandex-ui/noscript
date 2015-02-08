describe('ns.View: перерисовка через placeholder ->', function() {

    describe.only('1', function() {

        beforeEach(function() {

            ns.Model.define('mA');
            ns.Model.define('mB');
            ns.Model.define('mC');

            ns.View.define('vA', {models: ['mA']});
            ns.View.define('vB', {models: ['mB']});
            ns.View.define('vC', {models: ['mC']});

            ns.layout.define('app', {
                'vA': {
                    'vB': {
                        'vC': {}
                    }
                }
            });

            ns.test.modelsValidAutorespond(this.sinon);

            this.nodes = [];
            this.vA = ns.View.create('vA');
            var page = ns.layout.page('app');

            return new ns.Update(this.vA, page).render().then(function() {
                this.nodes.push(this.vA.node.querySelector('.ns-view-vC'));

                // инвалидируем модель mB
                ns.Model.get('mB').invalidate();

                return this.vA.update().then(function() {
                    this.nodes.push(this.vA.node.querySelector('.ns-view-vC'));
                }, null, this);
            }, null, this);
        });

        it('должен сохранить и не перерисовывать ноду vC', function() {
            expect(this.nodes[0]).to.be.equal(this.nodes[1]);
        });

    });

});
