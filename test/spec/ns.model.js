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

        ns.Model.define('m2', {
            params: function(params) {
                if (params.mode === 'custom') {
                    return { id: params.id, more: 'added' };
                }
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

                expect(define).to.throw();
            });

            it('should define a model', function() {
                var getInfo = function() {ns.Model.infoLite('dm1');};
                expect(getInfo).to.throw();

                ns.Model.define('dm1', {foo: 'bar'});

                expect(ns.Model.infoLite('dm1'))
                    .to.eql({foo: 'bar', isCollection: false, ready: false});
            });

            it('should create a constructor', function() {
                var ctor = function() {};
                var ctorDefined = ns.Model.define('dm1', {
                    ctor: ctor
                });

                expect(ctorDefined).to.be.equal(ctor);
            });

            it('should create a constructor with defined methods', function() {
                var bar = function() {};
                var ctor  = ns.Model.define('dm1', { methods: {foo: bar} });
                var proto = ctor.prototype;

                expect(proto)
                    .to.have.property('foo', bar);

                expect(Object.getPrototypeOf(proto))
                    .to.have.keys(Object.keys(ns.Model.prototype));
            });

        });

        describe('define: наследование', function() {

            beforeEach(function() {

                this.parent = ns.Model.define('parent', {
                    methods: {
                        superMethod: function() {}
                    }
                });

            });

            afterEach(function() {
                delete this.parent;
            });

            describe('через конструктор родителя', function() {

                beforeEach(function() {
                    ns.Model.define('child', {
                        methods: {
                            oneMore: function() {}
                        }
                    }, this.parent);

                    this.model = ns.Model.get('child', {});
                });

                afterEach(function() {
                    delete this.model;
                });

                checkChildModel();

            });

            describe('через название родителя', function() {

                beforeEach(function() {

                    ns.Model.define('child', {
                        methods: {
                            oneMore: function() {}
                        }
                    }, 'parent');

                    this.model = ns.Model.get('child', {});
                });

                afterEach(function() {
                    delete this.model;
                });

                checkChildModel();
            });

            function checkChildModel() {
                it('наследуемая model должен быть ns.Model', function() {
                    expect(this.model instanceof ns.Model).to.be.equal(true);
                });

                it('методы наследуются от базовой модели', function() {
                    expect(this.model.superMethod).to.be.a('function');
                });

                it('методы от базового model не ушли в ns.Model', function() {
                    expect(ns.Model.prototype.superMethod).to.be.an('undefined');
                });

                it('методы ns.Model на месте', function() {
                    expect(this.model.isValid).to.be.a('function');
                });

                it('методы из info.methods тоже не потерялись', function() {
                    expect(this.model.oneMore).to.be.a('function');
                });
            }
        });

        describe('ns.Model.getValid():', function() {

            it('should return null if model doesn\'t exists', function() {
                expect(ns.Model.getValid('m1')).to.be.equal(null);
            });

            it('should return valid model if exists', function() {
                var m = ns.Model.get('m1');
                m.setData({foo: 'bar'});
                expect(ns.Model.getValid('m1')).to.be.equal(m);
            });

            it('should throw exception if model is not defined', function() {
                var exists = function() { ns.Model.getValid('non-exists-model'); };
                expect(exists).to.throw();
            });

        });

        describe('ns.Model.get():', function() {

            it('should always return model', function() {
                expect(ns.Model.get('m1')).to.not.be.equal(ns.Model);
            });

            it('should return cached model if exists', function() {
                var m = ns.Model.get('m1');
                expect(ns.Model.get('m1')).to.be.equal(m);
            });

            it('should throw exception if model is not defined', function() {
                var exists = function() { ns.Model.getValid('non-exists-model'); };
                expect(exists).to.throw();
            });

        });

        describe('create', function() {

            it('should init model key', function() {
                var model = ns.Model.get('m1', {p1: 1, p3: 3});

                expect(model.key)
                    .to.be.equal('model=m1&p1=1&p2=2&p3=3&p4=foo');
            });

            it('should init model info', function() {
                var model = ns.Model.get('m1', {p1: 1, p3: 4});

                expect(model.info)
                    .to.contain.keys('params', 'events', 'pNames', 'isDo', 'isCollection');
            });

            it('should return cached model', function() {
                var old = ns.Model.get('m1', {p1: 1, p3: 5});
                var model = ns.Model.get('m1', {p1: 1, p3: 5});

                expect(model).to.be.equal(old);
            });

        });

        describe('info', function() {

            it('should set ready after first call', function() {
                expect( ns.Model.info('m1').ready )
                    .to.eql(true);
            });

            it('should return pNames property', function() {
                ns.Model.key('m1', { p1: 1, p3: 2 }); // init pNames
                expect( ns.Model.info('m1').pNames )
                    .to.eql(['p1', 'p2', 'p3', 'p4']);
            });

            it('should return isDo=true in for do models', function() {
                expect( ns.Model.info('do-m1').isDo )
                    .to.be.equal(true);
            });

            it('should return isDo=false for non-do models', function() {
                expect( ns.Model.info('m1').isDo )
                    .to.be.equal(false);
            });

            it('should return isCollection=true for split models', function() {
                expect( ns.Model.info('split1').isCollection)
                    .to.be.equal(true);
            });

            it('should return isCollection=false for non-split models', function() {
                expect( ns.Model.info('m1').isCollection)
                    .to.be.equal(false);
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
                    .to.eql(decl);
            });

        });

        describe('key', function() {

            it('should return right key', function() {
                expect( ns.Model.key('m1', {p1: 'foo', p2: 'bar', p3: 'baz', p4: 'aaz'}) )
                    .to.be.equal('model=m1&p1=foo&p2=bar&p3=baz&p4=aaz');
            });

            it('should return right key with defaults', function() {
                expect( ns.Model.key('m1', {p1: 'bar', p3: 'aaz'}) )
                    .to.be.equal('model=m1&p1=bar&p2=2&p3=aaz&p4=foo');
            });

            it('should return right incomplete key', function() {
                expect( ns.Model.key('m1', {p2: 'bar', p4: 'aaz'}) )
                    .to.be.equal('model=m1&p2=bar&p4=aaz');
            });

            it('should return specific key for do-model', function() {
                expect( ns.Model.key('do-m1', {p1: '1'}) )
                    .to.match(/^do-do-m1-\d+$/);
            });

            it('should return different keys for the same do-models on each call', function() {
                var k1 = ns.Model.key('do-m1');
                var k2 = ns.Model.key('do-m1');

                expect(k1).not.to.be.equal(k2);
            });

        });

        describe('info.params as a function', function() {

            it('function can return any object', function() {
                expect( ns.Model.key('m2', { mode: 'custom', id: 1 }) )
                    .to.be.equal('model=m2&id=1&more=added');
            });

            it('function can return nothing', function() {
                expect( ns.Model.key('m2', {}) )
                    .to.be.equal('model=m2');
            });

        });

        describe('_clear', function() {

            beforeEach(function() {
                var m = ns.Model.get('m0');
                m.setData({foo: 'bar'});
                ns.Model._clear();
            });

            it('should remove instances', function() {
                expect(ns.Model.getValid('m0')).not.to.be.ok;
            });

            it('should keep models defined', function() {
                expect(ns.Model.get('m0')).to.be.ok; // shouldn`t throw
            });

        });

    });

    describe('prototype', function() {

        describe('.get()', function() {

            beforeEach(function() {
                this.model = ns.Model.get('m0').setData({foo: 'bar'});
            });

            it('should returns .foo as string', function() {
                expect(this.model.get('.foo')).to.be.equal('bar');
            });

        });

        describe('_reset', function() {

            beforeEach(function() {
                this.model = ns.Model.get('m1', {p1: 1, p2: 2, p3: 3, p4: 4}).setData({foo: 'bar'});
            });

            it('should null all properties', function() {
                this.model._reset();

                expect(this.model.data).to.be.equal(null);
                expect(this.model.error).to.be.equal(null);

                expect(this.model.status).to.be.equal(this.model.STATUS.NONE);
                expect(this.model.retries).to.be.equal(0);

                expect(this.model.getVersion()).to.be.equal(0);
            });

            it('should null all properties with custom status', function() {
                this.model._reset('foo');

                expect(this.model.status).to.be.equal('foo');
            });

        });

        describe('_init', function() {

            it('should initialize model with given params', function() {
                var model = new ns.Model();
                this.sinon.spy(model, '_reset');
                this.sinon.spy(model, 'setData');
                this.sinon.spy(model, '_bindEvents');
                model._init('m1', {p1: 1, p2: 2, p3: 3, p4: 4});

                expect(model.id).to.be.equal('m1');
                expect(model.params).to.eql({p1: 1, p2: 2, p3: 3, p4: 4});

                expect(model._reset.calledOnce).to.be.equal(true);

                expect(model.info).to.be.equal( ns.Model.info('m1') );
                expect(model.key)
                    .to.be.equal( ns.Model.key('m1', {p1: 1, p2: 2, p3: 3, p4: 4}), model.info );

                expect(model._bindEvents.calledOnce).to.be.equal(true);
            });

        });

        describe('.select()', function() {

            beforeEach(function() {
                this.model = ns.Model.get('m0').setData({foo: 'bar'});
            });

            it('should returns .foo as array', function() {
                expect(this.model.select('.foo')).to.be.eql(['bar']);
            });

        });

        describe('#setData', function() {

            beforeEach(function() {
                this.model = ns.Model.get('m1', {p1: 1, p3: Math.random()});
                this.data = {foo: 'bar'};
            });

            it('should call preprocessData', function() {
                this.sinon.spy(this.model, 'preprocessData');

                this.model.setData(this.data);

                expect(this.model.preprocessData.calledOnce)
                    .to.be.equal(true);

                expect(this.model.preprocessData.calledWith(this.data))
                    .to.be.equal(true);
            });

            it('should reset error', function() {
                this.model.error = 1;

                this.model.setData(this.data);

                expect(this.model.error)
                    .to.be.equal(null);
            });

            it('should set status -> ok', function() {
                this.model.error = 123;

                this.model.setData(this.data);

                expect(this.model.status)
                    .to.be.equal(this.model.STATUS.OK);
            });

            it('should touch model', function() {
                this.sinon.spy(this.model, 'touch');

                this.model.setData(this.data);

                expect(this.model.touch.calledOnce)
                    .to.be.equal(true);
            });

            it('should set model data', function() {
                this.model.setData(this.data);

                expect(this.model.data)
                    .to.be.equal(this.data);
            });

            it('should trigger only two events', function() {
                this.sinon.spy(this.model, 'trigger');

                this.model.setData(this.data);

                expect(this.model.trigger.calledTwice)
                    .to.be.equal(true);
            });

            it('should trigger \'ns-model-changed\' event', function() {
                this.sinon.spy(this.model, 'trigger');

                this.model.setData(this.data);

                expect(this.model.trigger.calledWith('ns-model-changed', ''))
                    .to.be.equal(true);
            });

            it('should trigger \'ns-model-touched\' event', function() {
                this.sinon.spy(this.model, 'trigger');

                this.model.setData(this.data);

                expect(this.model.trigger.calledWith('ns-model-touched'))
                    .to.be.equal(true);
            });

            it('should increment model._version', function() {
                var v1 = this.model.getVersion();
                this.model.setData(this.data);
                var v2 = this.model.getVersion();

                expect(v2).to.be.equal(v1 + 1);
            });

            it('should not trigger \'ns-model-changed\' event when {silent: true}', function() {
                this.sinon.spy(this.model, 'trigger');

                this.model.setData(this.data, {silent: true});

                expect(this.model.trigger.calledWith('ns-model-changed'))
                    .not.to.be.equal(true);
            });

            it('should not trigger \'ns-model-touched\' event when {silent: true}', function() {
                this.sinon.spy(this.model, 'trigger');

                this.model.setData(this.data, {silent: true});

                expect(this.model.trigger.calledWith('ns-model-touched'))
                    .not.to.be.equal(true);
            });

            it('should not increment model._version', function() {
                var v1 = this.model.getVersion();
                this.model.setData(this.data, { silent: true });
                var v2 = this.model.getVersion();

                expect(v2).to.be.equal(v1);
            });

        });

        describe('#set', function() {

            beforeEach(function() {
                this.model = ns.Model.get('m1', {p1: 1, p3: Math.random()});
                this.jpath = '.flags.good';
                this.val = true;

                this.dataBefore = {};
                this.dataAfter = { flags: { good: true } };

                this.model.setData(this.dataBefore);
            });

            it('should touch model', function() {
                this.sinon.spy(this.model, 'touch');

                this.model.set(this.jpath, this.val);

                expect(this.model.touch.calledOnce)
                    .to.be.equal(true);
            });

            it('should set model data by jpath', function() {
                this.model.set(this.jpath, this.val);

                expect(this.model.getData())
                    .to.be.eql(this.dataAfter);
            });

            it('should trigger only 4 events', function() {
                this.sinon.spy(this.model, 'trigger');

                this.model.set(this.jpath, this.val);

                expect(this.model.trigger.callCount)
                    .to.be.equal(4);
            });

            it("should trigger 'ns-model-changed.flags.good' event", function() {
                this.sinon.spy(this.model, 'trigger');

                this.model.set(this.jpath, this.val);

                expect(this.model.trigger.calledWith('ns-model-changed.flags.good', '.flags.good', '.flags.good'))
                    .to.be.equal(true);
            });

            it("should trigger 'ns-model-changed.flags' event", function() {
                this.sinon.spy(this.model, 'trigger');

                this.model.set(this.jpath, this.val);

                expect(this.model.trigger.calledWith('ns-model-changed.flags', '.flags', '.flags.good'))
                    .to.be.equal(true);
            });

            it("should trigger 'ns-model-changed' event", function() {
                this.sinon.spy(this.model, 'trigger');

                this.model.set(this.jpath, this.val);

                expect(this.model.trigger.calledWith('ns-model-changed', '.flags.good'))
                    .to.be.equal(true);
            });

            it("should trigger 'ns-model-touched' event", function() {
                this.sinon.spy(this.model, 'trigger');

                this.model.set(this.jpath, this.val);

                expect(this.model.trigger.calledWith('ns-model-touched'))
                    .to.be.equal(true);
            });

            it('should increment model._version', function() {
                var v1 = this.model.getVersion();
                this.model.set(this.jpath, this.val);
                var v2 = this.model.getVersion();

                expect(v2).to.be.equal(v1 + 1);
            });

            it("should not trigger 'ns-model-changed.flags.good' event when called with { silent: true }", function() {
                this.sinon.spy(this.model, 'trigger');

                this.model.set(this.jpath, this.val, { silent: true });

                expect(this.model.trigger.calledWith('ns-model-changed.flags.good'))
                    .not.to.be.equal(true);
            });

            it("should not trigger 'ns-model-changed.flags' event when called with { silent: true }", function() {
                this.sinon.spy(this.model, 'trigger');

                this.model.set(this.jpath, this.val, { silent: true });

                expect(this.model.trigger.calledWith('ns-model-changed.flags'))
                    .not.to.be.equal(true);
            });

            it("should not trigger 'ns-model-changed' event when called with { silent: true }", function() {
                this.sinon.spy(this.model, 'trigger');

                this.model.set(this.jpath, this.val, { silent: true });

                expect(this.model.trigger.calledWith('ns-model-changed'))
                    .not.to.be.equal(true);
            });

            it("should not trigger 'ns-model-touched' event when called with { silent: true }", function() {
                this.sinon.spy(this.model, 'trigger');

                this.model.set(this.jpath, this.val, { silent: true });

                expect(this.model.trigger.calledWith('ns-model-touched'))
                    .not.to.be.equal(true);
            });

            it('should not increment model._version when called with { silent: true }', function() {
                var v1 = this.model.getVersion();
                this.model.setData(this.data, { silent: true });
                var v2 = this.model.getVersion();

                expect(v2).to.be.equal(v1);
            });

        });

        describe('hasDataChanged()', function() {

            beforeEach(function() {
                ns.Model.define('m10');

                ns.Model.define('m11', {
                    methods: {
                        hasDataChanged: function(data) {
                            var oldData = this.getData() || {};
                            return oldData.version !== data.version;
                        }
                    }
                });
            });

            describe('default version', function() {
                it('should not set data', function() {
                    var m = ns.Model.get('m10').setData({});

                    expect(m._version).to.be.equal(1);
                    expect(m.setData()._version).to.be.equal(1);
                    expect(m.setData(null)._version).to.be.equal(1);
                    expect(m.setData('')._version).to.be.equal(1); // NOTE вот на это можно напоросться: пустая строка это может быть и валидное значение.
                });

                it('should set data', function() {
                    var m = ns.Model.get('m10');

                    expect(m.setData({})._version).to.be.equal(1);
                    expect(m.setData(true)._version).to.be.equal(2);
                });
            });

            describe('custom version', function() {
                it('should not check data changed for the first setData call', function() {
                    var m = ns.Model.get('m11');
                    var spy = sinon.spy(m, 'hasDataChanged');
                    m.setData({ version: 1 });

                    expect(spy.callCount).to.be.equal(0);
                    expect(m._version).to.be.equal(1);
                    expect(m.getData()).to.be.eql({ version: 1 });

                    spy.restore();
                });

                it('should set data', function() {
                    var m = ns.Model.get('m11');
                    m.setData({ version: 1 });
                    m.setData({ version: 2 });
                    expect(m._version).to.be.equal(2);
                    expect(m.getData()).to.be.eql({ version: 2 });
                });

                it('should not set data if not changed', function() {
                    var m = ns.Model.get('m11');
                    m.setData({ version: 1 });
                    m.setData({ version: 1 });
                    expect(m._version).to.be.equal(1);
                    expect(m.getData()).to.be.eql({ version: 1 });
                });

                it('should set data even if it is not changed but model is invalid', function() {
                    var m = ns.Model.get('m11');
                    m.setData({ version: 1 });
                    m.invalidate();
                    m.setData({ version: 1 });
                    expect(m.isValid()).to.be.equal(true);
                    expect(m.getData()).to.be.eql({ version: 1 });
                });
            });

        });

        describe('getData', function() {

            beforeEach(function() {
                this.data = JSON.parse(JSON.stringify(ns.Model.TESTDATA.split1));
                this.model = ns.Model.get('split1', {p1: 1, p2: 2}).setData(this.data);
            });

            it('should return model\'s data', function() {
                var data = {foo: 'bar'};
                var model = ns.Model.get('m1', {p1: 1, p3: 2});
                model.setData(data);

                expect( model.getData() )
                    .to.be.equal(data);
            });

            it('should return no data if model is invalid', function() {
                var model = ns.Model.get('m1', {p1: 1, p3: 2});

                expect( model.getData() )
                    .to.be.equal(null);
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

                this.changedCb = this.sinon.spy();
                this.changedJpathCb = this.sinon.spy();

                this.eventsDeclaration = {
                    'ns-model-changed': this.changedCb,
                    'ns-model-changed.data': this.changedJpathCb
                };

                ns.Model.define('defined-events-2', {
                    events: this.eventsDeclaration
                });

                this.model = ns.Model.get('defined-events-2');
                this.model.setData({data: 1});
            });

            afterEach(function() {
                delete this.eventsDeclaration;
                delete this.changedCb;
                delete this.changedJpathCb;

                delete this.model;
            });

            it('should call callback on .setData()', function() {
                expect(this.changedCb.calledOnce).to.be.equal(true);
            });

            it('should call callback on .setData() with "model" as this', function() {
                expect(this.changedCb.calledOn(this.model)).to.be.equal(true);
            });

            it('should call callback on .set()', function() {
                this.model.set('.data', 2);
                expect(this.changedJpathCb.calledOnce).to.be.equal(true);
            });

            it('should call callback on .set() with "model" as this', function() {
                this.model.set('.data', 2);
                expect(this.changedJpathCb.calledOn(this.model)).to.be.equal(true);
            });

            it('should call callback on .set() with params', function() {
                this.model.set('.data', 2);
                expect(this.changedJpathCb.calledWith('ns-model-changed.data', '.data')).to.be.equal(true);
            });

        });

        describe('destroyWith', function() {

            beforeEach(function() {

                ns.Model.define('model1', {
                    params: {
                        id: null
                    }
                });
                this.model1 = ns.Model.get('model1', {id: 1}).setData({key: 1});

                ns.Model.define('model2', {
                    params: {
                        id: null
                    }
                });
                this.model2 = ns.Model.get('model2', {id: 1}).setData({key: 1});
            });

            afterEach(function() {
                delete this.model1;
                delete this.model2;
            });

            it('should destroy model2 after destroying model1', function() {
                this.model2.destroyWith(this.model1);
                ns.Model.destroy(this.model1);

                expect(ns.Model.getValid('model2', { id: 1 })).not.to.be.equal(true);
            });

            it('should throw error if tried to destroy ns.Model with string', function() {
                expect(function() { this.model1.destroyWith('string'); }).to.throw();
            });

            it('should throw error if tried to destroy ns.Model with undefined', function() {
                expect(function() { this.model1.destroyWith(ns.Model.getValid('model2', {id: 2})); }).to.throw();
            });
        });

        describe('#invalidate', function() {

            beforeEach(function() {
                ns.Model.define('model');
                this.model = ns.Model.get('model').setData('1');
                this.model.invalidate();
            });

            it('должен установить статус в невалидный', function() {
                expect(this.model.isValid()).to.be.equal(false);
            });

            it('не должен удалить данные', function() {
                expect(this.model.getData()).to.be.equal('1');
            });

        });

        describe('#traverse', function() {

            beforeEach(function() {
                ns.Model.define('traverseModel', {
                    params: {
                        p: null
                    }
                });

                ns.Model.get('traverseModel', { p: 1 }).setData({ part: 1 });
                ns.Model.get('traverseModel', { p: 2 }).setData({ part: 2 });
                ns.Model.get('traverseModel', { p: 3 }).setData({ part: 3 });
                ns.Model.get('traverseModel', { p: 4 }).setData({ part: 4 });
                ns.Model.get('traverseModel', { p: 5 }).setData({ part: 5 });

                this.partsSum = 15;

            });

            it('should throw error if tried to call with undefined model', function() {
                expect(function() {
                    return ns.Model.traverse('undefinedModel');
                }).to.throw();
            });

            it('should throw error if tried to call without callback function', function() {
                expect(function() {
                    return ns.Model.traverse('traverseModel');
                }).to.throw();
            });

            it('should go through all instances of model', function() {
                var counter = 0;

                ns.Model.traverse('traverseModel', function(model) {
                    counter += model.get('.part');
                });

                expect(counter).to.be.equal(this.partsSum);
            });

        });

        describe('params', function() {

            it('должны соответствовать собственным параметрам модели', function() {
                ns.Model.define('model', {
                    params: {
                        p1: null
                    }
                });

                expect(ns.Model.get('model', {p1: 1, p2: 2}).params).to.be.eql({p1: 1});
            });

        });

        describe('paramsRewrite', function() {

            it('должен вызывать после создания параметров стандартным способом', function() {
                ns.Model.define('myModel', {
                    "params": {
                        "p1": null,
                        "p2": null,
                        "p3": null,
                        "p4": null
                    },
                    "paramsRewrite": function(params) {
                        // бизнес-логика приложения предполагает, что p1 и p3 вместе быть не могут
                        if (params.p1 && params.p3) {
                            delete params.p3;
                        }
                        return params;
                    }
                });

                expect(ns.Model.get('myModel', {p1: 1, p2: 2, p3: 3}).params).to.be.eql({p1: 1, p2: 2});
            });

        });

    });

    describe('События', function() {

        describe('ns-model-init', function() {

            beforeEach(function() {
                this.nsModelInitSpy = sinon.spy();

                ns.Model.define('test-init-model', {
                    events: {
                        'ns-model-init': this.nsModelInitSpy
                    }
                });

                this.model = ns.Model.get('test-init-model');
            });

            afterEach(function() {
                delete this.model;
                delete this.nsModelInitSpy;
            });

            it('вызывается при создании модели', function() {
                expect(this.nsModelInitSpy.calledOnce).to.be.equal(true);
            });

            it('не вызывается второй раз при получении модели', function() {
                ns.Model.get('test-init-model');
                expect(this.nsModelInitSpy.calledOnce).to.be.equal(true);
            });

            it('не вызывается второй раз после записи данных в модель', function() {
                this.model.setData({'foo': 'bar'});
                expect(this.nsModelInitSpy.calledOnce).to.be.equal(true);
            });

            describe('повторная инициализация', function() {

                beforeEach(function() {
                    this.model.destroy();
                    this.nsModelInitSpy.reset();
                });

                it('вызывается при получения уничтоженной модели', function() {
                    ns.Model.get('test-init-model');
                    expect(this.nsModelInitSpy.calledOnce).to.be.equal(true);
                });

                it('вызывается при вызове #setData()', function() {
                    this.model.setData({'foo': 'bar'});
                    expect(this.nsModelInitSpy.calledOnce).to.be.equal(true);
                });

            });

        });

        describe('ns-model-destroyed, ns-model-before-destroyed', function() {
            beforeEach(function() {
                this.nsModelDestroySpy = sinon.spy();
                this.nsModelBeforeDestroySpy = sinon.spy();

                ns.Model.define('test-destroy-model', {
                    events: {
                        'ns-model-destroyed': this.nsModelDestroySpy,
                        'ns-model-before-destroyed': this.nsModelBeforeDestroySpy
                    }
                });

                this.model = ns.Model.get('test-destroy-model');
                this.model._reset = sinon.spy();

                var trigger = this.model.trigger;
                this.model.trigger = sinon.spy(function() {
                    trigger.apply(this, arguments);
                });

                this.model.destroy();
            });

            afterEach(function() {
                delete this.model;
                delete this.nsModelDestroySpy;
                delete this.nsModelBeforeDestroySpy;
            });

            it('ns-model-destroyed вызывается однократно при уничтожении модели', function() {
                expect(this.nsModelDestroySpy.calledOnce).to.be.equal(true);
            });

            it('ns-model-destroyed вызывается после сброса модели', function() {
                expect(this.model.trigger.calledWith('ns-model-destroyed')).to.be.equal(true);
                expect(this.model.trigger.calledAfter(this.model._reset)).to.be.equal(true);
            });

            it('ns-model-before-destroyed вызывается однократно при уничтожении модели', function() {
                expect(this.nsModelBeforeDestroySpy.calledOnce).to.be.equal(true);
            });

            it('ns-model-before-destroyed вызывается до сброса модели', function() {
                expect(this.model.trigger.calledWith('ns-model-before-destroyed')).to.be.equal(true);
                expect(this.model.trigger.calledBefore(this.model._reset)).to.be.equal(true);
            });

            it('ns-model-before-destroyed вызывается до ns-model-destroyed', function() {
                expect(this.nsModelDestroySpy.calledAfter(this.nsModelBeforeDestroySpy)).to.be.equal(true);
            });
        });

    });

    describe('ns.model.canRequest()', function() {

        beforeEach(function() {
            ns.Model.define('test-model');
            ns.Model.define('test-model-local', {
                methods: {
                    canRequest: function() {
                        return false;
                    }
                }
            });
        });

        describe('normal model', function() {

            beforeEach(function() {
                this.model = ns.Model.get('test-model');
                sinon.spy(this.model, 'canRequest');
            });

            afterEach(function() {
                this.model.canRequest.restore();
            });

            it('request model in error status', function() {
                this.model.setError({ name: 'fail' });
                ns.request('test-model');

                expect(this.model.canRequest).to.have.callCount(1);
                expect(this.sinon.server.requests).to.have.length(1);
            });

        });

        describe('local model', function() {

            beforeEach(function() {
                this.model = ns.Model.get('test-model-local');
                sinon.spy(this.model, 'canRequest');
            });

            afterEach(function() {
                this.model.canRequest.restore();
            });

            it('do not request valid model', function() {
                this.model.setData({ id: 7 });
                ns.request('test-model-local');

                expect(this.model.canRequest).to.have.callCount(0);
                expect(this.sinon.server.requests).to.have.length(0);
            });

            it('do not request valid model', function() {
                this.model.setData({ id: 7 });
                this.model.invalidate();
                ns.request('test-model-local');

                expect(this.model.canRequest).to.have.callCount(1);
                expect(this.sinon.server.requests).to.have.length(0);
            });

            it('do not request model in error status', function() {
                this.model.setError({ name: 'fail' });
                ns.request('test-model-local');

                expect(this.model.canRequest).to.have.callCount(1);
                expect(this.sinon.server.requests).to.have.length(0);
            });

        });

    });
});
