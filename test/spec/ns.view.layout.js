describe.only('ns.View dynamic layouts ->', function() {

    describe('Простой случай ->', function() {

        beforeEach(function() {

            ns.layout.define('app', {
                'view1': {
                    'view2': {}
                }
            });

            ns.layout.define('view2-layout', {
                'view3': {}
            });

            this.view2ModelStateFn = this.sinon.stub();
            ns.Model.define('view2-state', {
                methods: {
                    isOk: this.view2ModelStateFn
                }
            });

            ns.View.define('view1');
            ns.View.define('view2', {
                models: {
                    'view2-state': true
                },
                methods: {
                    patchLayout: function() {
                        if (this.getModel('view2-state').isOk()) {
                            return 'view2-layout';
                        }
                    }
                }
            });
            ns.View.define('view3');

            this.view = ns.View.create('view1');

            ns.test.modelsValidAutorespond(this.sinon);
        });

        describe('Отрисовка ->', function() {

            it('Должен создать view3, если отдали такой layout', function() {
                this.view2ModelStateFn.returns(true);

                return new ns.Update(this.view, ns.layout.page('app'), {})
                    .render()
                    .then(function() {
                        expect(this.view.node.querySelectorAll('.ns-view-view2>.ns-view-view3')).to.have.length(1);
                    }, null, this);
            });

            it('Не должен создать view3, если не отдали layout', function() {
                this.view2ModelStateFn.returns(false);

                return new ns.Update(this.view, ns.layout.page('app'), {})
                    .render()
                    .then(function() {
                        expect(this.view.node.querySelectorAll('.ns-view-view2>.ns-view-view3')).to.have.length(0);
                    }, null, this);
            });

        });

    });

});
