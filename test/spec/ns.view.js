describe('ns.View', function() {

    describe('ns.View.define', function() {

        beforeEach(function() {
            sinon.spy(ns.View, 'define');

            this.view = ns.View.define('test-view-define');
        });

        afterEach(function() {
            ns.View.define.restore();
        });

        it('should throw exception if I define View twice', function() {
            try {
                ns.View.define('test-view-define');
            } catch(e) {}

            expect(ns.View.define.getCall(1).threw()).to.be.ok();
        });

        it('should return new view', function() {
            expect(this.view).to.be.ok();
        });

        it('instance of new view should be ns.View', function() {
            var instance = ns.View.create('test-view-define', {});
            expect(instance instanceof ns.View).to.be.ok();
        });
    });

    describe('ns.View getModel/getModelData', function() {

        beforeEach(function() {
            ns.View.define('test-getModel', {
                models: ['test-getModel']
            });

            ns.Model.define('test-getModel', {
                params: {
                    p: null
                }
            });

            this.params = {p: 1};
            this.modelData = 'modeldata' + Math.random();

            this.model = ns.Model.create('test-getModel', this.params);
            this.model.setData(this.modelData);

            this.view = ns.View.create('test-getModel', this.params);
        });

        afterEach(function() {
            delete this.model;
            delete this.modelData;
            delete this.params;
            delete this.view;
        });

        it("getModel should returns view's model", function() {
            expect(this.view.getModel('test-getModel')).to.be(this.model);
        });

        it("getModelData should returns view's model data", function() {
            expect(this.view.getModelData('test-getModel')).to.be(this.modelData);
        });

    });

    describe('Наследование от другого view', function() {

        beforeEach(function() {

            var parentMegaView = ns.View.define('parentMegaView', {
                methods: {
                    superMethod: function() {}
                }
            });

            // inherits by class reference
            ns.View.define('childMegaViewByFunction', {
                methods: {
                    oneMore: function() {}
                }
            }, parentMegaView);

            // inherits by view name
            ns.View.define('childMegaViewByName', {
                methods: {
                    oneMore: function() {}
                }
            }, 'parentMegaView');
        });

        afterEach(function() {
            delete this.view;
        });

        var tests = {
            'childMegaViewByFunction': 'inherits by class reference',
            'childMegaViewByName': 'inherits by view name'
        };

        for (var viewName in tests) {
            (function(viewName, suiteName) {

                describe(suiteName, function() {

                    beforeEach(function() {
                        this.view = ns.View.create(viewName, {});
                    });

                    it('наследуемый view должен быть ns.View', function() {
                        expect(this.view instanceof ns.View).to.be.ok();
                    });

                    it('методы наследуются от базового view', function() {
                        expect(this.view.superMethod).to.be.ok();
                    });

                    it('методы от базового view не ушли в ns.View', function() {
                        expect(ns.View.prototype.superMethod).to.not.be.ok();
                    });

                    it('методы ns.View на месте', function() {
                        expect(this.view.isOk).to.be.ok();
                    });

                    it('методы из info.methods тоже не потерялись', function() {
                        expect(this.view.oneMore).to.be.ok();
                    });

                });

            })(viewName, tests[viewName]);
        }
    });

    describe('ns.View.info models parse', function() {

        describe('no models specified', function() {

            beforeEach(function() {
                ns.Model.define('a');
                ns.Model.define('b');
                ns.Model.define('c');
            });

            afterEach(function() {
                ns.Model.undefine();
            });

            it('no models at all', function() {
                ns.View.define('test-view-info-models-parse_no-models', {});

                var info = ns.View.info('test-view-info-models-parse_no-models');
                expect(info.models).to.be.eql({});

                ns.View.undefine('test-view-info-models-parse_no-models');
            });

            it('models specified as empty array', function() {
                ns.View.define('test-view-info-models-parse_empty-array', { models: [] });

                var info = ns.View.info('test-view-info-models-parse_empty-array');
                expect(info.models).to.be.eql({});

                ns.View.undefine('test-view-info-models-parse_empty-array');
            });

            it('models array is converted to object', function() {
                ns.View.define('test-view-info-models-parse_array', { models: [ 'a', 'b' ] });

                var info = ns.View.info('test-view-info-models-parse_array');
                expect(info.models).to.be.eql({ a: true, b: true });

                ns.View.undefine('test-view-info-models-parse_array');
            });
        });
    });

    describe('ns.View render', function() {

        describe('ns.View render with some invalid models', function() {

            beforeEach(function() {
                ns.Model.define('a');
                ns.Model.define('b');
                ns.Model.define('c');

                ns.View.define('test-view-render_complex', {
                    models: {
                        a: true,
                        b: false,
                        c: null
                    }
                });
            });

            afterEach(function() {
                ns.Model.undefine();
                ns.View.undefine();
            });

            it('required models are valid, optional ones — invalid', function() {
                var a = ns.Model.create('a', { id: 1 });
                var b = ns.Model.create('b', { id: 2 });
                var c = ns.Model.create('c', { id: 3 });

                a.setData({ data: 'a' });
                b.setError({ error: 'b invalid' });
                c.setError({ error: 'c invalid' });

                var view = ns.View.create('test-view-render_complex', {}, false);

                expect( view.isModelsValid() ).to.be.ok();
            });

            it('required model is invalid, the rest is valid', function() {
                var a = ns.Model.create('a', { id: 1 });
                var b = ns.Model.create('b', { id: 2 });
                var c = ns.Model.create('c', { id: 3 });

                a.setError({ error: 'a invalid' });
                b.setData({ data: 'b' });
                c.setData({ data: 'c' });

                var view = ns.View.create('test-view-render_complex', {}, false);
                expect( view.isModelsValid() ).not.to.be.ok();
            });

            it('render errors also', function() {
                var a = ns.Model.create('a', { id: 1 });
                var b = ns.Model.create('b', { id: 2 });
                var c = ns.Model.create('c', { id: 3 });

                a.setData({ data: 'a' });
                b.setError({ error: 'b invalid' });
                c.setError({ error: 'c invalid' });

                var view = ns.View.create('test-view-render_complex', {}, false);

                expect( view._getModelsData() ).to.be.eql({
                    a: { data: 'a' },
                    b: { error: 'b invalid' },
                    c: { error: 'c invalid' }
                });
            });

        });
    });

    describe('ns-init event', function() {

        it('should call event handler defined as string', function() {
            var spy = sinon.spy();
            ns.View.define('myblock', {
                events: {
                    'ns-init': 'initCallback'
                },
                methods: {
                    initCallback: spy
                }
            });
            ns.View.create('myblock');

            expect(spy.calledOnce).to.be.ok();
        });

        it('should call event handler defined as string with ns.View instance', function() {
            var spy = sinon.spy();
            ns.View.define('myblock', {
                events: {
                    'ns-init': 'initCallback'
                },
                methods: {
                    initCallback: spy
                }
            });
            ns.View.create('myblock');

            expect(spy.getCall(0).thisValue instanceof ns.View).to.be.ok();
        });

        it('should bind event defined as function', function() {
            var spy = sinon.spy();
            ns.View.define('myblock', {
                events: {
                    'ns-init': spy
                }
            });
            ns.View.create('myblock');

            expect(spy.calledOnce).to.be.ok();
        });

        it('should bind event defined as function with ns.View instance', function() {
            var spy = sinon.spy();
            ns.View.define('myblock', {
                events: {
                    'ns-init': spy
                }
            });
            ns.View.create('myblock');

            expect(spy.getCall(0).thisValue instanceof ns.View).to.be.ok();
        });

    });
});
