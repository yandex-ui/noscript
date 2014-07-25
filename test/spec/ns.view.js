describe('ns.View', function() {

    describe('ns.View.define', function() {

        beforeEach(function() {
            this.sinon.spy(ns.View, 'define');

            this.view = ns.View.define('test-view-define');
        });

        it('should throw exception if I define View twice', function() {
            try {
                ns.View.define('test-view-define');
            } catch(e) {}

            expect(ns.View.define.getCall(1).threw()).to.be.equal(true);
        });

        it('should return new view', function() {
            expect(this.view).to.be.a('function');
        });

        it('instance of new view should be ns.View', function() {
            var instance = ns.View.create('test-view-define', {});
            expect(instance instanceof ns.View).to.be.equal(true);
        });
    });

    describe('ns.View.info', function() {

        it('должен кинуть ошибку, если вид не определен', function() {
            expect(function() {
                ns.View.info('unknown');
            }).to.throw(Error);
        });

        it('должен разобрать параметры', function() {
            ns.View.define('test');
            expect(ns.View.info('test'))
                .to.have.property('pGroups')
                .and.be.an('Array');
        });

        it('должен разобрать события', function() {
            ns.View.define('test');
            expect(ns.View.info('test'))
                .to.have.property('createEvents')
                .and.be.an('Array');
        });

        it('не должен удалять исходную декларацию событий', function() {
            ns.View.define('test');
            expect(ns.View.info('test'))
                .to.have.property('events')
                .and.be.a('object');
        });

    });

    describe('ns.View.infoLite', function() {

        it('должен кинуть ошибку, если вид не определен', function() {
            expect(function() {
                ns.View.infoLite('unknown');
            }).to.throw(Error);
        });

        it('не должен разобрать параметры', function() {
            ns.View.define('test');
            expect(ns.View.infoLite('test')).to.not.have.property('pGroups');
        });

        it('не должен разобрать события', function() {
            ns.View.define('test');
            expect(ns.View.infoLite('test')).to.not.have.property('createEvents')
        });

        it('не должен удалять исходную декларацию событий', function() {
            ns.View.define('test');
            expect(ns.View.infoLite('test'))
                .to.have.property('events')
                .and.be.a('object');
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

            this.model = ns.Model.get('test-getModel', this.params);
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
            expect(this.view.getModel('test-getModel')).to.be.equal(this.model);
        });

        it("getModelData should returns view's model data", function() {
            expect(this.view.getModelData('test-getModel')).to.be.equal(this.modelData);
        });

    });

    describe('#_bindModels', function(done) {
        it('В обработчик изменения модели отправляем новую функцию', function(done) {

            ns.Model.define('test-model');
            var model = ns.Model.get('test-model');

            ns.View.define(
                'test-view',
                {
                    models: {
                        'test-model': {
                            'ns-model-changed': function(){
                                done()
                            }
                        }
                    }
                }
            );

            var view = ns.View.create('test-view', {});
            view._bindModels();
            model.setData({a : 2});
        });

        it('В обработчик изменения модели отправляем метод вьюхи', function(done) {

            ns.Model.define('test-model');
            var model = ns.Model.get('test-model');

            ns.View.define(
                'test-view',
                {
                    models: {
                        'test-model': {
                            'ns-model-changed': 'modelChanged'
                        }
                    },
                    methods: {
                        'modelChanged': function(){
                            done()
                        }
                    }
                }
            );

            var view = ns.View.create('test-view', {});
            view._bindModels();
            model.setData({a : 2});
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
                        expect(this.view instanceof ns.View).to.be.equal(true);
                    });

                    it('методы наследуются от базового view', function() {
                        expect(this.view.superMethod).to.be.a('function');
                    });

                    it('методы от базового view не ушли в ns.View', function() {
                        expect(ns.View.prototype.superMethod).to.be.an('undefined');
                    });

                    it('методы ns.View на месте', function() {
                        expect(this.view.isOk).to.be.a('function');
                    });

                    it('методы из info.methods тоже не потерялись', function() {
                        expect(this.view.oneMore).to.be.a('function');
                    });

                });

            })(viewName, tests[viewName]);
        }
    });

    describe('Декларация моделей', function() {
        describe('в виде массива', function() {
            it('должна преобразоваться в правильную полную декларацию', function() {
                var source = ['m1', 'm2'];
                expect(ns.View._formatModelsDecl(source)).to.eql({
                    m1: {
                        'ns-model-insert': 'invalidate',
                        'ns-model-remove': 'invalidate',
                        'ns-model-changed': 'invalidate',
                        'ns-model-destroyed': 'invalidate'
                    },
                    m2: {
                        'ns-model-insert': 'invalidate',
                        'ns-model-remove': 'invalidate',
                        'ns-model-changed': 'invalidate',
                        'ns-model-destroyed': 'invalidate'
                    }
                });
            });
        });

        describe('в виде объекта с boolean значениями', function() {
            it('должна преобразоваться в правильную полную декларацию', function() {
                var source = {'m1': true, 'm2': false};
                expect(ns.View._formatModelsDecl(source)).to.eql({
                    m1: {
                        'ns-model-insert': 'invalidate',
                        'ns-model-remove': 'invalidate',
                        'ns-model-changed': 'invalidate',
                        'ns-model-destroyed': 'invalidate'
                    },
                    m2: {
                        'ns-model-insert': 'keepValid',
                        'ns-model-remove': 'keepValid',
                        'ns-model-changed': 'keepValid',
                        'ns-model-destroyed': 'keepValid'
                    }
                });
            });
        });

        describe('с явным указанием единого обработчика для каждой модели', function() {
            it('должна преобразоваться в правильную полную декларацию', function() {
                var source = {
                    'm1': 'invalidate',
                    'm2': 'keepValid'
                };
                expect(ns.View._formatModelsDecl(source)).to.eql({
                    m1: {
                        'ns-model-insert': 'invalidate',
                        'ns-model-remove': 'invalidate',
                        'ns-model-changed': 'invalidate',
                        'ns-model-destroyed': 'invalidate'
                    },
                    m2: {
                        'ns-model-insert': 'keepValid',
                        'ns-model-remove': 'keepValid',
                        'ns-model-changed': 'keepValid',
                        'ns-model-destroyed': 'keepValid'
                    }
                });
            });
        });

        describe('с явным указанием отдельных обработчиков для некоторых событий', function() {
            it('должна преобразоваться в правильную полную декларацию', function() {
                var source = {
                    'm1': {
                        'ns-model-changed': 'keepValid',
                        'ns-model-changed.prop': 'keepValid'
                    },
                    'm2': {
                        'ns-model-insert': 'keepValid',
                        'ns-model-remove': 'keepValid'
                    }
                };
                expect(ns.View._formatModelsDecl(source)).to.eql({
                    m1: {
                        'ns-model-insert': 'invalidate',
                        'ns-model-remove': 'invalidate',
                        'ns-model-changed': 'keepValid',
                        'ns-model-changed.prop': 'keepValid',
                        'ns-model-destroyed': 'invalidate'
                    },
                    m2: {
                        'ns-model-insert': 'keepValid',
                        'ns-model-remove': 'keepValid',
                        'ns-model-changed': 'invalidate',
                        'ns-model-destroyed': 'invalidate'
                    }
                });
            });
        });
    });

    describe('ns.View render errors', function() {
        beforeEach(function() {
            ns.Model.define('a');
            ns.Model.define('b');
            ns.Model.define('c');

            ns.View.define('test-view-render_complex', {
                models: {
                    a: true,
                    b: false,
                    c: false
                }
            });
        });

        it('render errors also', function() {
            var a = ns.Model.get('a', { id: 1 });
            var b = ns.Model.get('b', { id: 2 });
            var c = ns.Model.get('c', { id: 3 });

            a.setData({ data: 'a' });
            b.setError({ error: 'b invalid' });
            c.setError({ error: 'c invalid' });

            var view = ns.View.create('test-view-render_complex', {}, false);
            view.tmpl();

            expect(ns.renderNode).to.be.calledWithMatch({
                views: {
                    'test-view-render_complex': {
                        models: {
                            a: {
                                a: {
                                    data: 'a'
                                },
                                status: 'ok'
                            },
                            b: {
                                b: {
                                    error: 'b invalid'
                                },
                                status: 'error'
                            },
                            c: {
                                c: {
                                    error: 'c invalid'
                                },
                                status: 'error'
                            }
                        }
                    }
                }
            });
        });
    });

    describe('ns-view-init event', function() {

        it('should call event handler defined as string', function() {
            var spy = this.sinon.spy();
            ns.View.define('myblock', {
                events: {
                    'ns-view-init': 'initCallback'
                },
                methods: {
                    initCallback: spy
                }
            });
            ns.View.create('myblock');

            expect(spy.calledOnce).to.be.equal(true);
        });

        it('should call event handler defined as string with ns.View instance', function() {
            var spy = this.sinon.spy();
            ns.View.define('myblock', {
                events: {
                    'ns-view-init': 'initCallback'
                },
                methods: {
                    initCallback: spy
                }
            });
            ns.View.create('myblock');

            expect(spy.getCall(0).thisValue instanceof ns.View).to.be.equal(true);
        });

        it('should bind event defined as function', function() {
            var spy = this.sinon.spy();
            ns.View.define('myblock', {
                events: {
                    'ns-view-init': spy
                }
            });
            ns.View.create('myblock');

            expect(spy.calledOnce).to.be.equal(true);
        });

        it('should bind event defined as function with ns.View instance', function() {
            var spy = this.sinon.spy();
            ns.View.define('myblock', {
                events: {
                    'ns-view-init': spy
                }
            });
            ns.View.create('myblock');

            expect(spy.getCall(0).thisValue instanceof ns.View).to.be.equal(true);
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
                expect(function() { ns.View.getKey('photo:v2', { login: 'test' }); }).to.throw();
            });

            it('В view.info.params задано значение для параметра (фильтр) и в params -- такое же значение', function() {
                expect(ns.View.getKey('photo:v3', { login: 'nop', id: 3 })).to.be.eql('view=photo:v3&login=nop&id=3');
            });

            it('В view.info.params задано одно значение для параметра, а в params пришло другое', function() {
                expect(function() { ns.View.getKey('photo:v3', { login: 'lynn', id: 3 }); }).to.throw();
            });

            it('В view.info.params задано значение для параметра, а в params значение отсутствует', function() {
                expect(function() { ns.View.getKey('photo:v3', { id: 3 }); }).to.throw();
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
                expect(function() { ns.View.getKey('slider', { album: 6, context_new: 'tag', id: 8, tag_new: 'girls' }); }).to.throw();
            });
        });

        describe('typeof view.info.params == "function"', function() {
            beforeEach(function() {
                ns.View.define('slider', {
                    params: function(params) {
                        if (params.mode === 'custom') {
                            return { id: params['id'] };
                        }
                        return {};
                    }
                });
            });

            it('view=slider&id=1', function() {
                expect(ns.View.getKey('slider', { mode: 'custom', id: 1 })).to.be.eql('view=slider&id=1');
            });

            it('view=slider&id=', function() {
                expect(ns.View.getKey('slider', { mode: 'custom', id: '' })).to.be.eql('view=slider&id=');
            });

            it('view=slider', function() {
                expect(ns.View.getKey('slider', { mode: 'new' })).to.be.eql('view=slider');
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
                expect(function() { ns.View.info('slider'); }).to.throw();
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

        describe('Когда ключ view строится по части параметров - this.params у view должны хранить исходный набор (а не тот, что используется в ключе)', function() {

            beforeEach(function() {
                ns.View.define('photo', { params: { login: null, id: null } });
            });

            it('preserve full params object', function() {
                var params = { login: 'a', id: 4, one_more: 'xx', per_page: 10 };
                var view = ns.View.create('photo', params);
                expect(view.params).to.eql(params);
            });

        });

    });

    describe('#patchTree()', function() {

        beforeEach(function(done) {
            this.patchTreeSpy = this.sinon.spy(function() {
                return {
                    key: '123',
                    prop: 'foo'
                }
            });
            ns.View.define('tst', {
                methods: {
                    patchTree: this.patchTreeSpy
                }
            });
            ns.layout.define('tst', {
                tst: true
            });
            var view = ns.View.create('tst');
            new ns.Update(view, ns.layout.page('tst'), {})
                .start()
                .then(function() {
                    done();
                });
        });

        it('при отрисовке должен вызвать #patchTree()', function() {
            expect(this.patchTreeSpy).have.been.called;
        });

        it('в дерево отрисовки вида должны попасть добавленный свойства', function() {
            var renderTree = ns.renderString.getCall(0).args[0];
            renderTree.views.tst.should.have.property('prop', 'foo');
        });

        it('в дерево отрисовки вида не должны попасть свойства, перетирающие стандартные', function() {
            var renderTree = ns.renderString.getCall(0).args[0];
            renderTree.views.tst.should.not.have.property('key', 'foo');
        });

    });

    describe('updateHTML', function() {

        describe('redraw async view with child depens on same model', function() {

            beforeEach(function(done) {
                var that = this;

                ns.layout.define('app', {
                    'app': {
                        'async-view&': {
                            'async-view-child': true
                        }
                    }
                });

                ns.View.define('app');
                ns.View.define('async-view', {models: ['async-view-model'] });
                ns.View.define('async-view-child', {models: ['async-view-model'] });

                ns.Model.define('async-view-model');

                // set first data to model
                var model = ns.Model.get('async-view-model', {}).setData({data: true});

                var APP = ns.View.create('app');

                this.sinon.server.autoRespond = true;
                this.sinon.server.respond(function(xhr) {
                    xhr.respond(
                        200,
                        {"Content-Type": "application/json"},
                        JSON.stringify({
                            models: [
                                { data: true }
                            ]
                        })
                    );
                });

                var layout = ns.layout.page('app', {});
                new ns.Update(APP, layout, {})
                    .start()
                    .then(function() {
                        model.invalidate();
                        that.asyncViewNode1 = APP.$node.find('.ns-view-async-view')[0];

                        new ns.Update(APP, layout, {})
                            .start()
                            .then(function(asyncPromises) {
                                Vow.all(asyncPromises.async)
                                    .then(function() {
                                        that.asyncViewNode2 = APP.$node.find('.ns-view-async-view')[0];
                                        done();
                                    }, function() {
                                        done('fail to init');
                                    });
                            });
                    });
            });

            afterEach(function() {
                delete this.asyncViewNode1;
                delete this.asyncViewNode2;
            });

            it('"async-view" should have different nodes after redraw', function() {
                expect(this.asyncViewNode2).not.to.be.equal(this.asyncViewNode1);
            });

            it('"async-view" should have child view', function() {
                expect($(this.asyncViewNode2).find('.ns-view-async-view-child')).to.have.length(1);
            });

        });

        describe('redraw old view when model was invalidated', function() {

            var goToPage = function(app, params, callback) {
                var layout = ns.layout.page('app', params);
                return new ns.Update(app, layout, params).start().then(function() { callback(); });
            };

            beforeEach(function() {
                this.spies = {};

                ns.View.define('app');
                ns.View.define('view', { models: [ 'model' ] });

                // Модель и сразу два экземляра создаём заранее
                ns.Model.define('model', { params: { id: null } });
                this.model1 = ns.Model.get('model', { id: 1 }).setData({ data: 1 });
                this.model2 = ns.Model.get('model', { id: 2 }).setData({ data: 2 });

                ns.layout.define('app', {
                    'app': {
                        'box@': 'view'
                    }
                });

                this.appView = ns.View.create('app');
            });

            it('redraw view after model invalidate while view was hidden', function(done) {
                var spies = this.spies;
                var model1 = this.model1;
                var app = this.appView;
                var view1;

                // Показываем страницы: 1 - 2 - 1
                goToPage(app, { id: 1 }, function() {
                    view1 = app.views.box.views['view=view&id=1'];

                    spies.view1Invalidate = this.sinon.spy(view1, 'invalidate');
                    spies.view1SetNode = this.sinon.spy(view1, '_setNode');
                    spies.view1Hide = this.sinon.spy(view1, '_hide');

                    goToPage(app, { id: 2 }, function() {
                        // view1 не видно.
                        expect(view1._visible).to.be.eql(false);
                        expect(spies.view1Hide.callCount).to.be.eql(1);
                        expect(spies.view1SetNode.callCount).to.be.eql(0);

                        // Меняется model1
                        model1.setData({ id: 1, changed: true });

                        // Идёт назад - view должно перерисоваться
                        goToPage(app, { id: 1 }, function() {
                            expect(spies.view1SetNode.callCount).to.be.eql(1);
                            done();
                        });
                    });
                });
            });

            it('do not bind twice to model changed after show - hide - show cicle', function(done) {
                var spies = this.spies;
                var model1 = this.model1;
                var app = this.appView;
                var view1;

                // Показываем страницы: 1 - 2 - 1 - 2
                // view1 показывалось 2 раза.
                // Надо проверить, что не будет двойного invalidate на ns-model-changed
                goToPage(app, { id: 1 }, function() {
                    view1 = app.views.box.views['view=view&id=1'];

                    spies.view1Invalidate = this.sinon.spy(view1, 'invalidate');

                    goToPage(app, { id: 2 }, function() {
                        goToPage(app, { id: 1 }, function() {
                            goToPage(app, { id: 2 }, function() {
                                model1.setData({ id: 1, changed: true });
                                expect(spies.view1Invalidate.callCount).to.be.eql(1);
                                done();
                            });
                        });
                    });
                });
            });
        });

        describe('перерисовка при изменении версии модели', function() {

            beforeEach(function() {

                ns.Model.define('model');
                ns.Model.get('model').setData('1');

                ns.View.define('app');
                ns.View.define('view', {models: ['model']});
                ns.layout.define('app', {app: {view: {} } });

                this.view = ns.View.create('app');

                return draw(this.view);
            });

            it('должен перерисовать вид после model.touch()', function() {
                var that = this;
                var beforeRedrawInnerHTML = this.view.node.innerHTML;

                // меняем версию модели, вид должен перерисоваться
                ns.Model.get('model').touch();

                return draw(this.view)
                    .then(function() {
                        expect(that.view.node.innerHTML).to.not.be.equal(beforeRedrawInnerHTML);
                    });
            });

            function draw(view) {
                return new ns.Update(view, ns.layout.page('app'), {}).render();
            }

        });

        describe('перерисовка на детаченной ноде', function() {

            beforeEach(function() {
                ns.View.define('popup');
                this.view = ns.View.create('popup');
                return this.view.update();
            });

            it('вид должен перерисоваться и получить новую ноду', function() {
                var oldNode = this.view.node;

                // эмулируем, что вставили эту ноду куда-то в DOM
                var div = document.createElement('div');
                div.appendChild(this.view.node);

                // эмулируем детач
                div.removeChild(this.view.node);

                this.view.invalidate();
                return this.view.update().then(function() {
                    expect(this.view.node).to.not.be.equal(oldNode);
                }, this);
            });

        });

    });

    describe('ns.View update after model destruction', function() {
        beforeEach(function(finish) {

            ns.Model.define('mSimple');

            // set data to collection
            ns.Model.get('mSimple').setData({foo: 'bar'});

            // define views
            ns.View.define('app');

            ns.View.define('vSimple', {
                models: [ 'mSimple' ]
            });

            // define layout
            ns.layout.define('app', {
                'app': {
                    'vSimple': {}
                }
            });

            // initiate first rendering
            this.APP = ns.View.create('app');
            var layout = ns.layout.page('app', {});
            new ns.Update(this.APP, layout, {})
                .start()
                .then(function() {
                    ns.Model.destroy(ns.Model.get('mSimple'));

                    ns.Model.get('mSimple').setData({foo: 'bar2'});

                    new ns.Update(this.APP, layout, {})
                        .start()
                        .then(function() {
                            finish();
                        }.bind(this));
                }.bind(this));
        });

        afterEach(function() {
            delete this.APP;
        });

        it('should have 1 node for view vSimple', function() {
            expect(this.APP.node.querySelectorAll('.ns-view-vSimple').length).to.be.equal(1);
        });

    });
});
