describe('ns.Model', function() {

    beforeEach(function() {
        ns.Model.define('m0');

        ns.Model.define('m1', {
            params: {
                p1: null,
                p2: 2,
                p3: null,
                p4: 'foo'
            }
        });

        ns.Model.define('do-m1', {
            params: {
                p1: null,
                p2: null
            }
        });

        ns.Model.define('split1', {
            params: {
                p1: null,
                p2: null
            },
            split: { // условное название
                items: '.item', // jpath, описывающий что именно выбирать.
                id: '.id', // jpath, описывающий как для каждого item'а вычислить его id.
                params: { // это расширенный jpath, конструирующий новый объект.
                    id: '.id',
                    foo: '.value'
                },
                model_id: 'split1-item'
            }
        });

        ns.Model.define('split1-item', {
            params: {
                id: null,
                foo: null
            }
        });

    });

    describe('static', function() {

        describe('define', function() {

            it('should throw on model redefine', function() {
                var define = function() { ns.Model.define('dm1'); };
                define();

                expect(define).to.throwException();
            });

            it('should fill _infos', function() {
                ns.Model.define('dm1', {foo: 'bar'});

                expect(ns.Model.privats()._infos['dm1'])
                    .to.eql({foo: 'bar', isCollection: false});
            });

            it('should fill _ctors with custom one', function() {
                var ctor = function() {};
                ns.Model.define('dm1', {
                    ctor: ctor
                });

                expect(ns.Model.privats()._ctors['dm1']).to.be(ctor);
            });

            it('should fill _ctors with one, contained methods', function() {
                var bar = function() {};
                ns.Model.define('dm1', { methods: {foo: bar} });
                var proto = ns.Model.privats()._ctors['dm1'].prototype;

                expect(proto)
                    .to.have.property('foo', bar);

                expect(proto.__proto__)
                    .to.have.keys(Object.keys(ns.Model.prototype));
            });

            it('should create _cache', function() {
                ns.Model.define('dm1');

                expect(ns.Model.privats()._cache['dm1'])
                    .to.eql({});
            });

        });

        describe('define: наследование', function() {

            beforeEach(function() {

                var parent = ns.Model.define('parent', {
                    methods: {
                        superMethod: function() {}
                    }
                });

                ns.Model.define('child', {
                    methods: {
                        oneMore: function() {}
                    }
                }, parent);

                this.model = ns.Model.create('child', {});
            });

            afterEach(function() {
                delete this.model;
            });

            it('наследуемая model должен быть ns.Model', function() {
                expect(this.model instanceof ns.Model).to.be.ok();
            });

            it('методы наследуются от базовой модели', function() {
                expect(this.model.superMethod).to.be.ok();
            });

            it('методы от базового view не ушли в ns.View', function() {
                expect(ns.Model.prototype.superMethod).to.not.be.ok();
            });

            it('методы ns.View на месте', function() {
                expect(this.model.isValid).to.be.ok();
            });

            it('методы из info.methods тоже не потерялись', function() {
                expect(this.model.oneMore).to.be.ok();
            });
        });

        describe('create', function() {

            it('should init model key', function() {
                var model = ns.Model.create('m1', {p1: 1, p3: 3});

                expect(model.key)
                    .to.be('model=m1&p1=1&p2=2&p3=3&p4=foo');
            });

            it('should init model info', function() {
                var model = ns.Model.create('m1', {p1: 1, p3: 4});

                expect(model.info)
                    .to.have.keys(['params', 'events', 'pNames', 'isDo', 'isCollection']);
            });

            it('should update data in existing model', function() {
                var old = ns.Model.create('m1', {p1: 1, p3: 5});

                sinon.spy(old, 'setData');

                var model = ns.Model.create('m1', {p1: 1, p3: 5}, {foo: 1});

                expect(model).to.be(old);

                expect(old.setData.calledWith({foo: 1})).to.be.ok();
            });

        });

        describe('info', function() {

            it('should return pNames property', function() {
                expect( ns.Model.info('m1').pNames )
                    .to.eql(['p1', 'p2', 'p3', 'p4']);
            });

            it('should return isDo=true in for do models', function() {
                expect( ns.Model.info('do-m1').isDo )
                    .to.be(true);
            });

            it('should return isDo=false for non-do models', function() {
                expect( ns.Model.info('m1').isDo )
                    .to.be(false);
            });

            it('should return isCollection=true for split models', function() {
                expect( ns.Model.info('split1').isCollection)
                    .to.be(true);
            });

            it('should return isCollection=false for non-split models', function() {
                expect( ns.Model.info('m1').isCollection)
                    .to.be(false);
            });

            it('should initialize \'params\' property', function() {
                expect( ns.Model.info('m0').params)
                    .to.eql({});
            });

            it('should return \'params\' property', function() {
                expect( ns.Model.info('m1').params)
                    .to.eql({p1: null, p2: 2, p3: null, p4: 'foo'});
            });

            it('should initialize \'events\' property', function() {
                expect( ns.Model.info('m0').events)
                    .to.eql({});
            });

            it('should return \'events\' property', function() {
                var decl = {
                    'ns-model-changed': function() {},
                    'ns-model-changed.data': function() {}
                };
                ns.Model.define('me0', {events: decl});

                expect( ns.Model.info('me0').events )
                    .to.eql(decl)
            });

        });

        describe('key', function() {

            it('should return right key', function() {
                expect( ns.Model.key('m1', {p1: 'foo', p2: 'bar', p3: 'baz', p4: 'aaz'}) )
                    .to.be('model=m1&p1=foo&p2=bar&p3=baz&p4=aaz');
            });

            it('should return right key with defaults', function() {
                expect( ns.Model.key('m1', {p1: 'bar', p3: 'aaz'}) )
                    .to.be('model=m1&p1=bar&p2=2&p3=aaz&p4=foo');
            });

            it('should return right incomplete key', function() {
                expect( ns.Model.key('m1', {p2: 'bar', p4: 'aaz'}) )
                    .to.be('model=m1&p2=bar&p4=aaz');
            });

            it('should return specific key for do-model', function() {
                expect( ns.Model.key('do-m1', {p1: '1'}) )
                    .to.match(/^do-do-m1-\d+$/);
            });

            it('should return different keys for the same do-models on each call', function() {
                var k1 = ns.Model.key('do-m1');
                var k2 = ns.Model.key('do-m1');

                expect(k1).not.to.be(k2);
            });

        });

    });

    describe('prototype', function() {

        describe('_reset', function() {

            beforeEach(function() {
                this.model = ns.Model.create('m1', {p1: 1, p2: 2, p3: 3, p4: 4}, {foo: 'bar'});
            });

            it('should null all properties', function() {
                this.model._reset();

                expect(this.model.data).to.be(null);
                expect(this.model.error).to.be(null);

                expect(this.model.status).to.be(this.model.STATUS.NONE);
                expect(this.model.retries).to.be(0);

                expect(this.model.timestamp).to.be(0);
            });

            it('should null all properties with custom status', function() {
                this.model._reset('foo');

                expect(this.model.status).to.be('foo');
            });

        });

        describe('_init', function() {

            it('should initialize model with given params', function() {
                var model = new ns.Model();
                sinon.spy(model, '_reset');
                sinon.spy(model, 'setData');
                sinon.spy(model, '_bindEvents');
                model._init('m1', {p1: 1, p2: 2, p3: 3, p4: 4}, {foo: 'bar'});

                expect(model.id).to.be('m1');
                expect(model.params).to.eql({p1: 1, p2: 2, p3: 3, p4: 4});

                expect(model._reset.calledOnce).to.be.ok();
                expect(model.setData.calledWith({foo: 'bar'})).to.be.ok();

                expect(model.info).to.be( ns.Model.info('m1') );
                expect(model.key)
                    .to.be( ns.Model.key('m1', {p1: 1, p2: 2, p3: 3, p4: 4}), model.info );

                expect(model._bindEvents.calledOnce).to.be.ok();
            });

        });

        describe('setData', function() {

            beforeEach(function() {
                this.model = ns.Model.create('m1', {p1: 1, p3: Math.random()});
                this.data = {foo: 'bar'};
            });

            it('should call preprocessData', function() {
                sinon.spy(this.model, 'preprocessData');

                this.model.setData(this.data);

                expect(this.model.preprocessData.calledOnce)
                    .to.be.ok();

                expect(this.model.preprocessData.calledWith(this.data))
                    .to.be.ok();
            });

            it('should reset error', function() {
                this.model.error = 1;

                this.model.setData(this.data);

                expect(this.model.error)
                    .to.be(null);
            });

            it('should set status -> ok', function() {
                this.model.error = 123;

                this.model.setData(this.data);

                expect(this.model.status)
                    .to.be(this.model.STATUS.OK);
            });

            it('should touch model', function() {
                sinon.spy(this.model, 'touch');

                this.model.setData(this.data);

                expect(this.model.touch.calledOnce)
                    .to.be.ok();
            });

            it('should set model data', function() {
                this.model.setData(this.data);

                expect(this.model.data)
                    .to.be(this.data);
            });

            it('should trigger only two events', function() {
                sinon.spy(this.model, 'trigger');

                this.model.setData(this.data);

                expect(this.model.trigger.calledTwice)
                    .to.be.ok();
            });

            it('should trigger \'ns-model-changed\' event', function() {
                sinon.spy(this.model, 'trigger');

                this.model.setData(this.data);

                expect(this.model.trigger.calledWith('ns-model-changed'))
                    .to.be.ok();
            });

            it('should trigger \'ns-model-touched\' event', function() {
                sinon.spy(this.model, 'trigger');

                this.model.setData(this.data);

                expect(this.model.trigger.calledWith('ns-model-touched'))
                    .to.be.ok();
            });

            it('should not trigger \'ns-model-changed\' event when {silent: true}', function() {
                sinon.spy(this.model, 'trigger');

                this.model.setData(this.data, {silent: true});

                expect(this.model.trigger.calledWith('ns-model-changed'))
                    .not.to.be.ok();
            });

        });

        describe('getData', function() {

            beforeEach(function() {
                this.data = JSON.parse(JSON.stringify(ns.Model.TESTDATA.split1));
                this.model = ns.Model.create('split1', {p1: 1, p2: 2}, this.data);
            });

            it('should return model\'s data', function() {
                var data = {foo: 'bar'};
                var model = ns.Model.create('m1', {p1: 1, p3: 2});
                model.setData(data);

                expect( model.getData() )
                    .to.be(data);
            });

            it('should return no data if model is invalid', function() {
                var model = ns.Model.create('m1', {p1: 1, p3: 2});

                expect( model.getData() )
                    .to.be(null);
            });

            it('should return data of splitted model', function() {
                expect( this.model.getData() )
                    .to.eql(this.data);
            });

            it('should return right data after submodel change', function() {
                this.model.models[0].setData({id: 1, value: 'foo', newvalue: 'boo'});

                this.data.item[0].newvalue = 'boo';

                expect( this.model.getData() )
                    .to.eql(this.data);
            });

        });

        describe('trigger', function() {

            beforeEach(function() {

                ns.Model.define('defined-events-1');

                this.changedCb = sinon.spy();
                this.changedJpathCb = sinon.spy();

                this.eventsDeclaration = {
                    'ns-model-changed': this.changedCb,
                    'ns-model-changed.data': this.changedJpathCb
                };

                ns.Model.define('defined-events-2', {
                    events: this.eventsDeclaration
                });

                this.model = ns.Model.create('defined-events-2');
                this.model.setData({data: 1});
            });

            afterEach(function() {
                delete this.eventsDeclaration;
                delete this.changedCb;
                delete this.changedJpathCb;

                delete this.model;
            });

            it('should call callback on .setData()', function() {
                expect(this.changedCb.calledOnce).to.be.ok();
            });

            it('should call callback on .setData() with "model" as this', function() {
                expect(this.changedCb.calledOn(this.model)).to.be.ok();
            });

            it('should call callback on .set()', function() {
                this.model.set('.data', 2);
                expect(this.changedJpathCb.calledOnce).to.be.ok();
            });

            it('should call callback on .set() with "model" as this', function() {
                this.model.set('.data', 2);
                expect(this.changedJpathCb.calledOn(this.model)).to.be.ok();
            });

            it('should call callback on .set() with params', function() {
                this.model.set('.data', 2);
                expect(this.changedJpathCb.calledWith('ns-model-changed.data', '.data')).to.be.ok();
            });

        });

    });

});
