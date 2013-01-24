describe('no.Model', function() {

    afterEach(function() {
        // чистим кэш созданных моделей после каждого теста
        for (var key in no.Model.privats._cache) {
            no.Model.privats._cache[key] = {};
        }
    });

    describe('static', function() {

        describe('define', function() {

            it('should throw on model redefine', function() {
                var define = function() { no.Model.define('dm1'); };
                define();

                expect(define).to.throwException(/Model 'dm1' can't be redefined!/);
            });

            it('should fill _infos', function() {
                no.Model.define('dm1', {foo: 'bar'});

                expect(no.Model.privats._infos['dm1'])
                    .to.eql({foo: 'bar'});
            });

            it('should fill _ctors with default one', function() {
                no.Model.define('dm1');

                expect(no.Model.privats._ctors['dm1'])
                    .to.be(no.Model);
            });

            it('should fill _ctors with custom one', function() {
                var ctor = function() {};
                no.Model.define('dm1', {}, ctor);

                expect(no.Model.privats._ctors['dm1'])
                    .to.be(ctor);
            });

            it('should fill _ctors with one, contained methods', function() {
                var bar = function() {};
                no.Model.define('dm1', { methods: {foo: bar} });
                var proto = no.Model.privats._ctors['dm1'].prototype;

                expect(proto)
                    .to.have.property('foo', bar);

                expect(proto.__proto__)
                    .to.have.keys(Object.keys(no.Model.prototype));
            });

            it('should create _cache', function() {
                no.Model.define('dm1');

                expect(no.Model.privats._cache['dm1'])
                    .to.eql({});
            });

            afterEach(function() {
                no.Model.undefine('dm1');
            });

        });

        describe('create', function() {

            it('should init model key', function() {
                var model = no.Model.create('m1', {p1: 1, p3: 3});

                expect(model.key)
                    .to.be('model=m1&p1=1&p2=2&p3=3&p4=foo');
            });

            it('should init model info', function() {
                var model = no.Model.create('m1', {p1: 1, p3: 4});

                expect(model.info)
                    .to.have.keys(['params', 'events', 'pNames', 'isDo', 'isSplit']);
            });

            it('should update data in existing model', function() {
                var old = no.Model.create('m1', {p1: 1, p3: 5});

                sinon.spy(old, 'setData');

                var model = no.Model.create('m1', {p1: 1, p3: 5}, {foo: 1});

                expect(model).to.be(old);

                expect(old.setData.calledWith({foo: 1})).to.be.ok();
            });

        });

        describe('info', function() {

            it('should return pNames property', function() {
                expect( no.Model.info('m1').pNames )
                    .to.eql(['p1', 'p2', 'p3', 'p4']);
            });

            it('should return isDo=true in for do models', function() {
                expect( no.Model.info('do-m1').isDo )
                    .to.be(true);
            });

            it('should return isDo=false for non-do models', function() {
                expect( no.Model.info('m1').isDo )
                    .to.be(false);
            });

            it('should return isSplit=true for split models', function() {
                expect( no.Model.info('split1').isSplit)
                    .to.be(true);
            });

            it('should return isSplit=false for non-split models', function() {
                expect( no.Model.info('m1').isSplit)
                    .to.be(false);
            });

            it('should initialize \'params\' property', function() {
                expect( no.Model.info('m0').params)
                    .to.eql({});
            });

            it('should return \'params\' property', function() {
                expect( no.Model.info('m1').params)
                    .to.eql({p1: null, p2: 2, p3: null, p4: 'foo'});
            });

            it('should initialize \'events\' property', function() {
                expect( no.Model.info('m0').events)
                    .to.eql({});
            });

            it('should return \'events\' property', function() {
                var decl = {
                    'changed': function() {},
                    'changed..data': function() {}
                };
                no.Model.define('me0', {events: decl});

                expect( no.Model.info('me0').events )
                    .to.eql(decl)
            });

        });

        describe('key', function() {

            it('should return right key', function() {
                expect( no.Model.key('m1', {p1: 'foo', p2: 'bar', p3: 'baz', p4: 'aaz'}) )
                    .to.be('model=m1&p1=foo&p2=bar&p3=baz&p4=aaz');
            });

            it('should return right key with defaults', function() {
                expect( no.Model.key('m1', {p1: 'bar', p3: 'aaz'}) )
                    .to.be('model=m1&p1=bar&p2=2&p3=aaz&p4=foo');
            });

            it('should return right incomplete key', function() {
                expect( no.Model.key('m1', {p2: 'bar', p4: 'aaz'}) )
                    .to.be('model=m1&p2=bar&p4=aaz');
            });

            it('should return specific key for do-model', function() {
                expect( no.Model.key('do-m1', {p1: '1'}) )
                    .to.match(/^do-\d+$/);
            });

            it('should return different keys for the same do-models on each call', function() {
                var k1 = no.Model.key('do-m1');
                var k2 = no.Model.key('do-m1');

                expect(k1).not.to.be(k2);
            });

        });

    });

    describe('prototype', function() {

        describe('_reset', function() {

            beforeEach(function() {
                this.model = no.Model.create('m1', {p1: 1, p2: 2, p3: 3, p4: 4}, {foo: 'bar'});
            });

            it('should null all properties', function() {
                this.model._reset();

                expect(this.model.data).to.be(null);
                expect(this.model.error).to.be(null);

                expect(this.model.status).to.be(this.model.STATUS_NONE);
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
                var model = new no.Model();
                sinon.spy(model, '_reset');
                sinon.spy(model, 'setData');
                sinon.spy(model, '_bindEvents');
                model._init('m1', {p1: 1, p2: 2, p3: 3, p4: 4}, {foo: 'bar'});

                expect(model.id).to.be('m1');
                expect(model.params).to.eql({p1: 1, p2: 2, p3: 3, p4: 4});

                expect(model._reset.calledOnce).to.be.ok();
                expect(model.setData.calledWith({foo: 'bar'})).to.be.ok();

                expect(model.info).to.be( no.Model.info('m1') );
                expect(model.key)
                    .to.be( no.Model.key('m1', {p1: 1, p2: 2, p3: 3, p4: 4}), model.info );

                expect(model._bindEvents.calledOnce).to.be.ok();
            });

        });

        describe('_splitData', function() {
            // пришлось поизвращаться, чтобы sinon заработал
            var callback;

            beforeEach(function() {
                callback = sinon.spy();
                this.data = JSON.parse(JSON.stringify(no.Model.TESTDATA.split1));
                this.model = no.Model.create('split1', {p1: 1, p2: Math.random()});
                this.model.trigger = function() { callback(); }

                this.model._splitData(this.data);
                this.models = this.model.splitModels;
            });

            it('should create nested models', function() {
                expect(this.models.length)
                    .to.be(3);
            });

            it('should set data to nested models', function() {
                expect(this.models[0].data).to.eql(this.data.item[0]);
                expect(this.models[1].data).to.eql(this.data.item[1]);
                expect(this.models[2].data).to.eql(this.data.item[2]);
            });

            it('should set params to nested models', function() {
                expect(this.models[0].params).to.eql({id: 1, foo: 'foo'});
                expect(this.models[1].params).to.eql({id: 2, foo: 'bar'});
                expect(this.models[2].params).to.eql({id: 3, foo: 'baz'});
            });

            it('should trigger collections \'changed\' on submodel\'s \'changed\'', function() {
                this.models[0].setData({id: 1, foo: 'foo', bar: 'bar'});
                expect(callback.callCount).to.be(1);
            });

            it('should not duplicate \'changed\' bindings', function() {
                this.model._splitData(this.data);
                this.model._splitData(this.data);
                this.models[0].setData({id: 1, foo: 'foo', bar: 'bar'});
                expect(callback.callCount).to.be(1);
            });

            it('should not trigger if submodel not in collection now', function() {
                var data = this.data;
                data.item = data.item.slice(1, 3);
                var model = this.models[0];

                this.model._splitData(data);

                model.setData({id: 1, foo: 'foo', bar: 'bar'});

                expect(callback.called).not.to.be.ok();
            });

        });

        describe('setData', function() {

            beforeEach(function() {
                this.model = no.Model.create('m1', {p1: 1, p3: Math.random()});
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
                    .to.be(this.model.STATUS_OK);
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

            it('should trigger \'changed\' event', function() {
                sinon.spy(this.model, 'trigger');

                this.model.setData(this.data);

                expect(this.model.trigger.calledOnce)
                    .to.be.ok();

                expect(this.model.trigger.calledWith('changed'))
                    .to.be.ok();
            });

            it('should not trigger \'changed\' event when {silent: true}', function() {
                sinon.spy(this.model, 'trigger');

                this.model.setData(this.data, {silent: true});

                expect(this.model.trigger.calledOnce)
                    .not.to.be.ok();
            });

            it('should call _splitData for split-models', function() {
                var model = no.Model.create('split1', {p1: 1, p2: 2});

                sinon.spy(model, '_splitData');

                model.setData(no.Model.TESTDATA.split1);

                expect(model._splitData.calledOnce)
                    .to.be.ok();

                expect(model._splitData.calledWith(no.Model.TESTDATA.split1))
                    .to.be.ok();
            });

        });

        describe('getData', function() {

            beforeEach(function() {
                this.data = JSON.parse(JSON.stringify(no.Model.TESTDATA.split1));
                this.model = no.Model.create('split1', {p1: 1, p2: 2}, this.data);
            })

            it('should return model\'s data', function() {
                var data = {foo: 'bar'};
                var model = no.Model.create('m1', {p1: 1, p3: 2});
                model.setData(data);

                expect( model.getData() )
                    .to.be(data);
            });

            it('should return data of splitted model', function() {
                expect( this.model.getData() )
                    .to.eql(this.data);
            });

            it('should return right data after submodel change', function() {
                this.model.splitModels[0].setData({id: 1, value: 'foo', newvalue: 'boo'});

                this.data.item[0].newvalue = 'boo';

                expect( this.model.getData() )
                    .to.eql(this.data);
            });

        });

        describe('trigger', function() {

            beforeEach(function() {

                no.Model.define('defined-events-1');

                this.changedCb = sinon.spy();
                this.changedJpathCb = sinon.spy();

                this.eventsDeclaration = {
                    'changed': this.changedCb,
                    'changed..data': this.changedJpathCb
                };

                no.Model.define('defined-events-2', {
                    events: this.eventsDeclaration
                });

                this.model = no.Model.create('defined-events-2');
                this.model.setData({data: 1});
            });

            afterEach(function() {
                delete this.eventsDeclaration;
                delete this.changedCb;
                delete this.changedJpathCb;

                no.Model.undefine('defined-events-1');
                no.Model.undefine('defined-events-2');
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
                expect(this.changedJpathCb.calledWith('changed..data', {
                    'old': 1,
                    'new': 2,
                    'jpath': '.data'
                })).to.be.ok();
            });

        });

    });

});
