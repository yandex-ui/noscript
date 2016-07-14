describe('ns.Events', function() {

    describe('#atrigger', function() {

        beforeEach(function() {
            this.spy = this.sinon.spy();
            /** @mixes ns.Events */
            this.foo = {};
            no.extend(this.foo, ns.Events);
            this.foo.on('bar', this.spy);
        });

        afterEach(function() {
            delete this.foo;
            delete this.spy;
        });

        it('должен вызвать обработчик события', function(done) {
            this.foo.atrigger('bar');
            window.setTimeout(function() {
                expect(this.spy).to.have.callCount(1);
                done();
            }.bind(this), 10);
        });

        it('вызов без аргументов', function(done) {
            this.foo.atrigger('bar');
            window.setTimeout(function() {
                expect(this.spy).have.been.calledWith('bar');
                done();
            }.bind(this), 10);
        });

        it('вызов с 1 аргументом', function(done) {
            this.foo.atrigger('bar', 1);
            window.setTimeout(function() {
                expect(this.spy).have.been.calledWith('bar', 1);
                done();
            }.bind(this), 10);
        });

        it('вызов с 2 аргументами', function(done) {
            this.foo.atrigger('bar', 1, 2);
            window.setTimeout(function() {
                expect(this.spy).have.been.calledWith('bar', 1, 2);
                done();
            }.bind(this), 10);
        });

    });

    describe('#off', function() {

        beforeEach(function() {
            this.spy1 = this.sinon.spy();
            this.spy2 = this.sinon.spy();
            this.foo = {};
            no.extend(this.foo, ns.Events);
            this.foo.on('bar', this.spy1);
            this.foo.on('bar', this.spy2);
        });

        afterEach(function() {
            delete this.foo;
            delete this.spy1;
            delete this.spy2;
        });

        it('должен отписать переданный обработчик', function() {
            this.foo.off('bar', this.spy1);
            this.foo.trigger('bar');
            expect(this.spy1).to.have.callCount(0);
        });

        it('должен отписать переданный обработчик и не тронуть другие', function() {
            this.foo.off('bar', this.spy1);
            this.foo.trigger('bar');
            expect(this.spy2).to.have.callCount(1);
        });

        it('должен отписать все обработчики, если не передали', function() {
            this.foo.off('bar');
            this.foo.trigger('bar');
            expect(this.spy1).to.have.callCount(0);
            expect(this.spy2).to.have.callCount(0);
        });

    });

    describe('#on', function() {

        it('должен бросить исключение, если не передан обработчик', function() {
            this.foo = {};
            no.extend(this.foo, ns.Events);

            var fn = function() {
                ns.Events.on('event');
            };

            expect(fn).to.throw();
        });

        it('должен бросить исключение, если передана не функция', function() {
            this.foo = {};
            no.extend(this.foo, ns.Events);

            var fn = function() {
                ns.Events.on('event', {});
            };

            expect(fn).to.throw();
        });

    });

    describe('#once', function() {

        beforeEach(function() {
            this.spy = this.sinon.spy();
            ns.events.once('test', this.spy);
        });

        it('должен вызвать обработчик один раз', function() {
            ns.events.trigger('test');
            ns.events.trigger('test');
            expect(this.spy).to.have.callCount(1);
        });

        it('должен вызвать обработчик в контексте ns.events', function() {
            ns.events.trigger('test');
            expect(this.spy.getCall(0).thisValue).to.be.equal(ns.events);
        });

        it('должен отписаться при вызове ns.events.off', function() {
            ns.events.off('test', this.spy);
            ns.events.trigger('test');
            expect(this.spy).to.have.callCount(0);
        });
        it('двойной once', function() {
            ns.events.once('test', this.spy);
            ns.events.trigger('test');
            expect(this.spy).to.have.callCount(2);
        });
        it('двойной once и off', function() {
            ns.events.once('test', this.spy);
            ns.events.off('test', this.spy);
            ns.events.trigger('test');
            expect(this.spy).to.have.callCount(1);
        });
        it('должен отписаться на off', function() {
            ns.events.off('test');
            ns.events.trigger('test');
            expect(this.spy).to.have.callCount(0);
        });

    });

    describe('#trigger', function() {

        beforeEach(function() {
            this.spy = this.sinon.stub();
            this.foo = {};
            no.extend(this.foo, ns.Events);
            this.foo.on('bar', this.spy);
        });

        afterEach(function() {
            delete this.foo;
            delete this.spy;
        });

        it('должен вызвать обработчик события', function() {
            this.foo.trigger('bar');
            expect(this.spy).to.have.callCount(1);
        });

        it('вызов без аргументов', function() {
            this.foo.trigger('bar');
            expect(this.spy).have.been.calledWith('bar');
        });

        it('вызов с 1 аргументом', function() {
            this.foo.trigger('bar', 1);
            expect(this.spy).have.been.calledWith('bar', 1);
        });

        it('вызов с 2 аргументами', function() {
            this.foo.trigger('bar', 1, 2);
            expect(this.spy).have.been.calledWith('bar', 1, 2);
        });

        it('очередь не должна ломаться, если обработчик отписывается по время вызова', function() {
            var unbind = this.sinon.spy(function() {
                this.foo.off('bar', unbind);
            }.bind(this));

            this.spy2 = this.sinon.spy();

            this.foo.on('bar', unbind);
            this.foo.on('bar', this.spy2);

            this.foo.trigger('bar');

            expect(this.spy).to.have.callCount(1);
            expect(unbind).to.have.callCount(1);
            expect(this.spy2).to.have.callCount(1);
        });

        it('очередь не должна ломаться, если обработчик кидает исключение', function() {
            // spy бросит исключение,
            // мы это точно знаем, поэтому убираем логирование,
            // чтобы не бросать в лог лишнего
            ns.log.exception.restore();
            this.spy.throws('1');

            this.spy2 = this.sinon.spy();
            this.foo.on('bar', this.spy2);

            this.foo.trigger('bar');

            expect(this.spy).to.have.callCount(1);
            expect(this.spy2).to.have.callCount(1);
        });

    });

});
