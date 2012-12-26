describe('no.Model', function() {

    describe('static', function() {

        describe('define', function() {

            it('should throw on model redefine', function() {
                var define = function() { no.Model.define('dm1'); };
                define();

                expect(define).to.throwException(/Model can't be redefined!/);
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

            it('should return different keys for the one do models on each call', function() {
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
                expect(this.model.requests).to.be(0);

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
                model._init('m1', {p1: 1, p2: 2, p3: 3, p4: 4}, {foo: 'bar'});

                expect(model.id).to.be('m1');
                expect(model.params).to.eql({p1: 1, p2: 2, p3: 3, p4: 4});

                expect(model._reset.calledOnce).to.be.ok();
                expect(model.setData.calledWith({foo: 'bar'})).to.be.ok();

                expect(model.info).to.be( no.Model.info('m1') );
                expect(model.key)
                    .to.be( no.Model.key('m1', {p1: 1, p2: 2, p3: 3, p4: 4}), model.info );

                expect(model.timestamp).to.be(0);
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
