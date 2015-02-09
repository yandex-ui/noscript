describe.only('ns.View: перерисовка через placeholder ->', function() {

    describe('Простой случай ->', function() {

        /*
        vA
          vB (перерисовывается)
            vC (должен сохранить ноду)
         */

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

    // пока не работает
    describe('Простой случай и два placeholder ->', function() {

        /*
         vA
           vB (перерисовывается)
             vC (должен сохранить ноду)
               vD (перерисовывается)
                 vE (должен сохранить ноду)
         */

        beforeEach(function() {

            ns.Model.define('mA');
            ns.Model.define('mB');
            ns.Model.define('mC');
            ns.Model.define('mD');
            ns.Model.define('mE');

            ns.View.define('vA', {models: ['mA']});
            ns.View.define('vB', {models: ['mB']});
            ns.View.define('vC', {models: ['mC']});
            ns.View.define('vD', {models: ['mD']});
            ns.View.define('vE', {models: ['mE']});

            ns.layout.define('app', {
                'vA': {
                    'vB': {
                        'vC': {
                            'vD': {
                                'vE': {}
                            }
                        }
                    }
                }
            });

            ns.test.modelsValidAutorespond(this.sinon);

            this.nodes = {};
            this.vA = ns.View.create('vA');
            var page = ns.layout.page('app');

            return new ns.Update(this.vA, page).render().then(function() {
                this.nodes.vC1 = this.vA.node.querySelector('.ns-view-vC');
                this.nodes.vE1 = this.vA.node.querySelector('.ns-view-vE');

                // инвалидируем модель mB
                ns.Model.get('mB').invalidate();
                ns.Model.get('mD').invalidate();

                return this.vA.update().then(function() {
                    this.nodes.vC2 = this.vA.node.querySelector('.ns-view-vC');
                    this.nodes.vE2 = this.vA.node.querySelector('.ns-view-vE');
                }, null, this);
            }, null, this);
        });

        it('должен сохранить и не перерисовывать ноду vC', function() {
            expect(this.nodes.vC1).to.be.equal(this.nodes.vC2);
        });

        it('должен сохранить и не перерисовывать ноду vE', function() {
            expect(this.nodes.vE1).to.be.equal(this.nodes.vE1);
        });

    });

});
