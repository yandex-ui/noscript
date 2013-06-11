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

    describe('ns-view-init event', function() {

        it('should call event handler defined as string', function() {
            var spy = sinon.spy();
            ns.View.define('myblock', {
                events: {
                    'ns-view-init': 'initCallback'
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
                    'ns-view-init': 'initCallback'
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
                    'ns-view-init': spy
                }
            });
            ns.View.create('myblock');

            expect(spy.calledOnce).to.be.ok();
        });

        it('should bind event defined as function with ns.View instance', function() {
            var spy = sinon.spy();
            ns.View.define('myblock', {
                events: {
                    'ns-view-init': spy
                }
            });
            ns.View.create('myblock');

            expect(spy.getCall(0).thisValue instanceof ns.View).to.be.ok();
        });

    });

    describe('ns.View.info.params вычисление ключа view', function() {

        describe('Ключ строится по параметрам моделей: view.info.params == null', function() {

            beforeEach(function() {
                ns.Model.define('photo', { params: { login: null, id: null } });
                ns.Model.define('photo-tags', { params: { id: null, one_more: null, per_page: 10 } });
                ns.View.define('photo', {
                    models: [ 'photo', 'photo-tags' ]
                });
                ns.View.info('photo'); // это чтобы view полностью внутри проинициализировалось
            });

            it('Ключ view строится по параметрам моделей', function() {
                var params = { login: 'a', id: 4, one_more: 'xx', per_page: 10 };
                expect( ns.View.getKey('photo', params) ).to.be.eql('view=photo&login=a&id=4&one_more=xx&per_page=10');
            });

            it('Умолчательное значение параметра модели должно добавляться к ключу view', function() {
                // Потому что это ключ для модели, а следовательно, для данных и для того, что отображается во view.
                var params = { login: 'a', id: 4, one_more: 'xx' };
                expect( ns.View.getKey('photo', params) ).to.be.eql('view=photo&login=a&id=4&one_more=xx&per_page=10');
            });
        });

        describe('typeof view.info.params == "object"', function() {
            beforeEach(function() {
                ns.View.define('photo:v2', {
                    params: { login: null, id: null }
                });
                ns.View.define('photo:v3', {
                    params: { login: 'nop', id: null }
                });

                ns.View.info('photo:v2');
                ns.View.info('photo:v3');
            });

            it('Все параметры есть: ключ строится', function() {
                expect(ns.View.getKey('photo:v2', { login: 'test', id: 2 })).to.be.eql('view=photo:v2&login=test&id=2');
            });

            it('Ключ не должен строиться, если параметров не хватает', function() {
                expect(function() { ns.View.getKey('photo:v2', { login: 'test' }); }).to.throwError();
            });

            it('В view.info.params задано значение для параметра (фильтр) и в params -- такое же значение', function() {
                expect(ns.View.getKey('photo:v3', { login: 'nop', id: 3 })).to.be.eql('view=photo:v3&login=nop&id=3');
            });

            it('В view.info.params задано одно значение для параметра, а в params пришло другое', function() {
                expect(function() { ns.View.getKey('photo:v3', { login: 'lynn', id: 3 }); }).to.throwError();
            });

            it('В view.info.params задано значение для параметра, а в params значение отсутствует', function() {
                expect(function() { ns.View.getKey('photo:v3', { id: 3 }); }).to.throwError();
            });
        });

        describe('typeof view.info.params == "array"', function() {
            beforeEach(function() {
                ns.View.define('slider', {
                    params: [
                        { 'context': 'contest', 'id': null },
                        { 'context': null },
                        { 'tag': null, 'login': null },
                        { 'login': null, 'album': null }
                    ]
                });
            });

            it('Ключ по 1-ому варианту с фильтром по одному из параметров', function() {
                expect(ns.View.getKey('slider', { login: 'nop', album: 6, context: 'contest', id: 3 })).to.be.eql('view=slider&context=contest&id=3');
            });

            it('Ключ по 2-ому варианту (для первого варианта не хватает параметров)', function() {
                expect(ns.View.getKey('slider', { login: 'nop', album: 6, context: 'contest' })).to.be.eql('view=slider&context=contest');
            });

            it('Ключ по 3-ому варианту', function() {
                expect(ns.View.getKey('slider', { login: 'nop', album: 6, context_new: 'tag', id: 8, tag: 'girls' })).to.be.eql('view=slider&tag=girls&login=nop');
            });

            it('Ключ по 4-ому варианту', function() {
                expect(ns.View.getKey('slider', { login: 'nop', album: 6, context_new: 'tag', id: 8, tag_new: 'girls' })).to.be.eql('view=slider&login=nop&album=6');
            });

            it('Ни один из вариантов не подходит', function() {
                expect(function() { ns.View.getKey('slider', { album: 6, context_new: 'tag', id: 8, tag_new: 'girls' }); }).to.throwError();
            });
        });

        describe('ns.View: params+ / params-', function() {
            beforeEach(function() {
                ns.View.define('slider', {
                    params: [
                        { 'context': 'contest', 'id': null },
                        { 'context': null }
                    ],
                    'params-': []
                });
            });

            it('Нельзя указывать одновременно params и params+/-', function() {
                expect(function() { ns.View.info('slider') }).to.throwError();
            });
        });

        describe('ns.View: params+', function() {
            beforeEach(function() {
                ns.Model.define('photo', { params: { login: null, id: null } });
                ns.Model.define('photo-tags', { params: { id: null, one_more: null, per_page: 10 } });
                ns.View.define('photo', {
                    models: [ 'photo', 'photo-tags' ],
                    'params+': {
                        'add_me': 666
                    }
                });
                ns.View.info('photo'); // это чтобы view полностью внутри проинициализировалось
            });

            it('params+ добавляются к ключу', function() {
                var params = { login: 'a', id: 4, one_more: 'xx', per_page: 10 };
                expect( ns.View.getKey('photo', params) ).to.be.eql('view=photo&login=a&id=4&one_more=xx&per_page=10&add_me=666');
            });
        });

        describe('ns.View: params-', function() {
            beforeEach(function() {
                ns.Model.define('photo', { params: { login: null, id: null } });
                ns.Model.define('photo-tags', { params: { id: null, one_more: null, per_page: 10 } });
                ns.View.define('photo', {
                    models: [ 'photo', 'photo-tags' ],
                    'params-': [ 'one_more' ]
                });
                ns.View.info('photo'); // это чтобы view полностью внутри проинициализировалось
            });

            it('params- исключаются из ключа', function() {
                var params = { login: 'a', id: 4, one_more: 'xx', per_page: 10 };
                expect( ns.View.getKey('photo', params) ).to.be.eql('view=photo&login=a&id=4&per_page=10');
            });
        });

    });

});
