describe('no.Model', function() {

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

        describe('info', function() {

            it('should return pNames in info', function() {
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

            beforeEach(function() {
                this.data = no.Model.TESTDATA.split1;
                this.model = no.Model.create('split1', {p1: 1, p2: Math.random()});

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

        });

        describe('setData', function() {

            beforeEach(function() {
                this.model = no.Model.create('m1', {p1: 1, p4: Math.random()});
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

            it('should return model\'s data', function() {
                var data = {foo: 'bar'};
                var model = no.Model.create('m1', {p1: 1, p4: 2});
                model.setData(data);

                expect( model.getData() )
                    .to.be(data);
            });

        });


    });


    /*
    no.Model.define('split-item');
    no.Model.define('split', {
        params: {
            page: null,
            rank: null
        },
        split: { // условное название
            items: '.item', // jpath, описывающий что именно выбирать.
            id: '.id', // jpath, описывающий как для каждого item'а вычислить его id.
            params: { // это расширенный jpath, конструирующий новый объект.
                id: '.id',
                foo: '.foo.bar'
            },
            model_id: 'split-item'
        }
    });
    */

});
