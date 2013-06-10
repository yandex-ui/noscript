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

    describe('Наследование от другого view', function() {

        beforeEach(function() {

            var parentMegaView = ns.View.define('parentMegaView', {
                methods: {
                    superMethod: function() {}
                }
            });

            ns.View.define('childMegaView', {
                methods: {
                    oneMore: function() {}
                }
            }, parentMegaView);

            this.view = ns.View.create('childMegaView', {});
        });

        afterEach(function() {
            delete this.view;
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

    describe('ns.View.info events parse', function() {

        beforeEach(function() {
            ns.View.define('test-view-info-events-parse', {
                events: {
                    'scroll window': no.nop,
                    'scroll document': no.nop,

                    'scroll@init window': no.nop,
                    'scroll@init document': no.nop,

                    'resize window': no.nop,
                    'resize document': no.nop,

                    'resize@init window': no.nop,
                    'resize@init document': no.nop,

                    'scroll .foo-init': no.nop,
                    'scroll': no.nop,
                    'click': no.nop,
                    'click .bar-init': no.nop,

                    'scroll@show .foo-show': no.nop,
                    'scroll@show': no.nop,
                    'click@show': no.nop,
                    'click@show .bar-show': no.nop,

                    'my-global-init-event-short': no.nop,

                    'my-global-init-event@init': no.nop,

                    'my-global-show-event@show': no.nop
                }
            });

            this.viewInfo = ns.View.info('test-view-info-events-parse');
        });

        afterEach(function() {
            delete this.viewInfo;
        });

        describe('DOM events', function() {

            it('"initEvents" should be the object', function() {
                expect(this.viewInfo.initEvents).to.be.a('object');
            });

            it('"initEvents.bind" should be the array', function() {
                expect(this.viewInfo.initEvents['bind']).to.be.a('array');
            });

            it('"initEvents.delegate" should be the array', function() {
                expect(this.viewInfo.initEvents['delegate']).to.be.a('array');
            });

            it('"showEvents" should be the object', function() {
                expect(this.viewInfo.showEvents).to.be.a('object');
            });

            it('"showEvents.bind" should be the array', function() {
                expect(this.viewInfo.showEvents['bind']).to.be.a('array');
            });

            it('"showEvents.delegate" should be the array', function() {
                expect(this.viewInfo.showEvents['delegate']).to.be.a('array');
            });

            it('should parse delegated init events properly', function() {
                expect(this.viewInfo.initEvents['delegate']).to.be.eql([
                    ['scroll', 'window', no.nop],
                    ['scroll', 'document', no.nop],

                    ['resize', 'window', no.nop],
                    ['resize', 'document', no.nop],

                    ['scroll', '', no.nop],
                    ['click', '', no.nop],
                    ['click', '.bar-init', no.nop]
                ]);
            });

            it('should parse bind init events properly', function() {
                expect(this.viewInfo.initEvents['bind']).to.be.eql([
                    ['scroll', '.foo-init', no.nop]
                ]);
            });

            it('should parse show events properly', function() {
                expect(this.viewInfo.showEvents['delegate']).to.be.eql([
                    ['scroll', 'window', no.nop],
                    ['scroll', 'document', no.nop],
                    ['resize', 'window', no.nop],
                    ['resize', 'document', no.nop],

                    ['scroll', '', no.nop],
                    ['click', '', no.nop],
                    ['click', '.bar-show', no.nop]
                ]);
            });

            it('should parse show events properly', function() {
                expect(this.viewInfo.showEvents['bind']).to.be.eql([
                    ['scroll', '.foo-show', no.nop]
                ]);
            });
        });

        describe('no.events', function() {
            it('"initNoevents" should be the object', function() {
                expect(this.viewInfo.initNoevents).to.be.a('object');
            });

            it('"initNoevents.global" should be the array', function() {
                expect(this.viewInfo.initNoevents['global']).to.be.a('array');
            });

            it('"initNoevents.local" should be the array', function() {
                expect(this.viewInfo.initNoevents['local']).to.be.a('array');
            });

            it('"showNoevents" should be the object', function() {
                expect(this.viewInfo.showNoevents).to.be.a('object');
            });

            it('"showNoevents.global" should be the array', function() {
                expect(this.viewInfo.showNoevents['global']).to.be.a('array');
            });

            it('"showNoevents.local" should be the array', function() {
                expect(this.viewInfo.showNoevents['local']).to.be.a('array');
            });

            it('should parse global init noevents properly', function() {
                expect(this.viewInfo.initNoevents['global']).to.be.eql([
                    ['my-global-init-event-short', no.nop],
                    ['my-global-init-event', no.nop]
                ]);
            });

            it('should parse local init noevents properly', function() {
                expect(this.viewInfo.initNoevents['local']).to.be.eql([]);
            });

            it('should parse global show noevents properly', function() {
                expect(this.viewInfo.showNoevents['global']).to.be.eql([
                    ['my-global-show-event', no.nop]
                ]);
            });

            it('should parse local show noevents properly', function() {
                expect(this.viewInfo.showNoevents['local']).to.be.eql([]);
            });
        });
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

    describe('ns.View._bindEventHandlers', function() {

        beforeEach(function() {
            this.view = new ns.View();
            this.view.myTestFunc = function() {return this};

            this.eventArr = [
                [ '1', function(){return this} ],
                [ '2', 'myTestFunc' ]
            ];

            this.bindedEventArr = this.view._bindEventHandlers(this.eventArr, 1);
        });

        afterEach(function() {
            delete this.view;
            delete this.eventArr;
            delete this.bindedEventArr;
        });

        it('should return array copy', function() {
            expect(this.bindedEventArr !== this.eventArr).to.be.ok();
        });

        it('should return array with same length', function() {
            expect(this.bindedEventArr.length).to.be(this.eventArr.length);
        });

        it('should process handler as function', function() {
            expect(this.bindedEventArr[0][1]).to.be.a('function');
        });

        it('should return binded function', function() {
            expect(this.bindedEventArr[0][1]()).to.be(this.view);
        });

        it('should return prototype method if handler is string', function() {
            expect(this.bindedEventArr[1][1]).to.be.a('function');
        });

        it('should return binded prototype method if handler is string', function() {
            expect(this.bindedEventArr[1][1]()).to.be(this.view);
        });
    });

    describe('ns.View._getEvents', function() {

        beforeEach(function() {
            this.view = new ns.View();

            this.bindArr = [1];
            this.delegateArr = [2];
            this.localArr = [3];
            this.globalArr = [4];

            this.view.info = {
                initEvents: {
                    'bind': this.bindArr,
                    'delegate': this.delegateArr
                },
                initNoevents: {
                    'local': this.localArr,
                    'global': this.globalArr
                }
            };

            sinon.stub(this.view, '_bindEventHandlers', function() {
                return [];
            });

            this.result = this.view._getEvents('init');
        });

        afterEach(function() {
            this.view._bindEventHandlers.restore();
            delete this.view;

            delete this.bindArr;
            delete this.delegateArr;
            delete this.localArr;
            delete this.globalArr;
            delete this.result;
        });

        it('should return properly object', function() {
            expect(this.result).to.be.eql({
                'bind': [],
                'delegate': [],
                'ns-local': [],
                'ns-global': []
            });
        });

        it('should call _bindEventHandlers 4 times', function() {
            expect(this.view._bindEventHandlers.callCount).to.be(4)
        });

        it('should call _bindEventHandlers for delegated events', function() {
            expect(this.view._bindEventHandlers.calledWithExactly(this.delegateArr, 2)).to.be.ok()
        });

        it('should call _bindEventHandlers for bind events', function() {
            expect(this.view._bindEventHandlers.calledWithExactly(this.bindArr, 2)).to.be.ok()
        });

        it('should call _bindEventHandlers for local no.events', function() {
            expect(this.view._bindEventHandlers.calledWithExactly(this.localArr, 1)).to.be.ok()
        });

        it('should call _bindEventHandlers for global no.events', function() {
            expect(this.view._bindEventHandlers.calledWithExactly(this.globalArr, 1)).to.be.ok()
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
