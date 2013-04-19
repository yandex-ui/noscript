describe('ns.View', function() {

    describe('ns.View.define', function() {

        beforeEach(function() {
            sinon.spy(ns.View, 'define');

            this.view = ns.View.define('test-view-define');
        });

        afterEach(function() {
            ns.View.define.restore();
            ns.View.undefine('test-view-define');
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
            ns.View.undefine('parentMegaView');
            ns.View.undefine('childMegaView');
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

        ns.View.define('test-view-info-events-parse', {
            events: {
                'scroll window': no.pe,
                'scroll document': no.pe,

                'scroll@init window': no.pe,
                'scroll@init document': no.pe,

                'resize window': no.pe,
                'resize document': no.pe,

                'resize@init window': no.pe,
                'resize@init document': no.pe,

                'scroll .foo-init': no.pe,
                'scroll': no.pe,
                'click': no.pe,
                'click .bar-init': no.pe,

                'scroll@show .foo-show': no.pe,
                'scroll@show': no.pe,
                'click@show': no.pe,
                'click@show .bar-show': no.pe,

                'my-global-init-event-short': no.pe,
                'my-local-init-event-short .': no.pe,

                'my-global-init-event@init': no.pe,
                'my-local-init-event@init .': no.pe,

                'my-global-show-event@show': no.pe,
                'my-local-show-event@show .': no.pe
            }
        });

        beforeEach(function() {
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
                    ['scroll', 'window', no.pe],
                    ['scroll', 'document', no.pe],

                    ['resize', 'window', no.pe],
                    ['resize', 'document', no.pe],

                    ['scroll', '', no.pe],
                    ['click', '', no.pe],
                    ['click', '.bar-init', no.pe]
                ]);
            });

            it('should parse bind init events properly', function() {
                expect(this.viewInfo.initEvents['bind']).to.be.eql([
                    ['scroll', '.foo-init', no.pe]
                ]);
            });

            it('should parse show events properly', function() {
                expect(this.viewInfo.showEvents['delegate']).to.be.eql([
                    ['scroll', 'window', no.pe],
                    ['scroll', 'document', no.pe],
                    ['resize', 'window', no.pe],
                    ['resize', 'document', no.pe],

                    ['scroll', '', no.pe],
                    ['click', '', no.pe],
                    ['click', '.bar-show', no.pe]
                ]);
            });

            it('should parse show events properly', function() {
                expect(this.viewInfo.showEvents['bind']).to.be.eql([
                    ['scroll', '.foo-show', no.pe]
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
                    ['my-global-init-event-short', no.pe],
                    ['my-global-init-event', no.pe]
                ]);
            });

            it('should parse local init noevents properly', function() {
                expect(this.viewInfo.initNoevents['local']).to.be.eql([
                    ['my-local-init-event-short', no.pe],
                    ['my-local-init-event', no.pe]
                ]);
            });

            it('should parse global show noevents properly', function() {
                expect(this.viewInfo.showNoevents['global']).to.be.eql([
                    ['my-global-show-event', no.pe]
                ]);
            });

            it('should parse local show noevents properly', function() {
                expect(this.viewInfo.showNoevents['local']).to.be.eql([
                    ['my-local-show-event', no.pe]
                ]);
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
                'no-local': [],
                'no-global': []
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
});
