describe('ns.View bind events', function() {

    beforeEach(function() {
        this.name = 'test-view-info-events-parse';

        ns.View.define(this.name, {
            events: {
                'click window': no.nop,
                'click document': no.nop,

                'scroll@init window': no.nop,
                'scroll@init document': no.nop,

                'mousedown window': no.nop,
                'mousedown document': no.nop,

                'resize@init window': no.nop,
                'resize@init document': no.nop,

                'scroll .foo-init': no.nop,
                'scroll': no.nop,
                'mousedown': no.nop,
                'click .bar-init': no.nop,

                'scroll@show .foo-show': no.nop,
                'scroll@show': no.nop,
                'mousedown@show': no.nop,
                'click@show .bar-show': no.nop,

                'my-global-show-event-short': no.nop,

                'my-global-init-event@init': no.nop,

                'my-global-show-event@show': no.nop
            }
        });

        this.view = ns.View.create(this.name);
        this.view._setNode(document.createElement('div'));

        // doochik: не знаю как это нормально проверить без доступа к приватным переменным
        this.sinon.stub(this.view._$window, 'on', no.nop);
        this.sinon.stub(this.view._$window, 'off', no.nop);

        this.sinon.stub(this.view._$document, 'on', no.nop);
        this.sinon.stub(this.view._$document, 'off', no.nop);

        this.sinon.stub(this.view.$node, 'on', no.nop);
        this.sinon.stub(this.view.$node, 'off', no.nop);

        this.sinon.spy(ns.events, 'off');
        this.sinon.spy(ns.events, 'on');

        var that = this;
        this.findOnSpy = this.sinon.spy();
        this.findOffSpy = this.sinon.spy();

        this.sinon.stub(this.view.$node, 'find', function() {
            return {
                on: that.findOnSpy,
                off: that.findOffSpy
            }
        });

    });

    afterEach(function() {
        delete this.view;
        delete this.name;
        delete this.findOnSpy;
        delete this.findOffSpy;
    });

    describe('init events', function() {

        describe('bind', function() {

            beforeEach(function() {
                this.view._bindEvents('init');
            });

            describe('window', function() {

                it('should bind 2 events', function() {
                    expect(this.view._$window.on.calledTwice).to.be.equal(true);
                });

                it('should bind scroll event', function() {
                    expect(this.view._$window.on.calledWith('scroll')).to.be.equal(true);
                });

                it('should bind resize event', function() {
                    expect(this.view._$window.on.calledWith('resize')).to.be.equal(true);
                });

            });

            describe('document', function() {

                it('should bind 2 events', function() {
                    expect(this.view._$document.on.calledTwice).to.be.equal(true);
                });

                it('should bind scroll event', function() {
                    expect(this.view._$document.on).to.be.calledWith('scroll');
                });

                it('should bind resize event', function() {
                    expect(this.view._$document.on).to.be.calledWith('resize');
                });

            });

            describe('$node', function() {

                it('should bind 3 delegated events', function() {
                    expect(this.view.$node.on.callCount).to.be.equal(3);
                });

                it('should bind scroll', function() {
                    expect(this.view.$node.on).to.be.calledWith('scroll');
                });

                it('should bind mousedown without selector', function() {
                    expect(this.view.$node.on).to.be.calledWith('mousedown');
                });

                it('should bind click with selector', function() {
                    expect(this.view.$node.on).to.be.calledWith('click', '.bar-init');
                });

                it('should bind 1 non-delegated events', function() {
                    expect(this.findOnSpy.calledOnce).to.be.equal(true);
                });

                it('should call find for non-delegated scroll event', function() {
                    expect(this.view.$node.find).to.be.calledWith('.foo-init');
                });

                it('should bind non-delegated scroll event', function() {
                    expect(this.findOnSpy).to.be.calledWith('scroll');
                });

            });

            describe('custom ns.events', function() {

                it('should bind one event handler', function() {
                    expect(ns.events.on).to.have.callCount(1);
                });

                it('should bind handler for "my-global-init-event@init"', function() {
                    expect(ns.events.on).have.been.calledWith('my-global-init-event');
                });

            });

        });

        describe('unbind', function() {

            beforeEach(function() {
                this.view._bindEvents('init');
                this.view._unbindEvents('init');
            });

            describe('window', function() {

                it('should unbind all events', function() {
                    expect(this.view._$window.off).to.have.callCount(2);
                });

                it('should unbind events properly', function() {
                    var bind = this.view._$window.on;
                    for (var i = 0; i < bind.callCount; i++) {
                        var call = bind.getCall(i);
                        expect(this.view._$window.off, call.args[0]).to.be.calledWith(call.args[0], call.args[1]);
                    }
                });

            });

            describe('document', function() {

                it('should call unbind once', function() {
                    expect(this.view._$document.off).to.have.callCount(2);
                });

                it('should unbind events properly', function() {
                    var bind = this.view._$document.on;
                    for (var i = 0; i < bind.callCount; i++) {
                        var call = bind.getCall(i);
                        expect(this.view._$document.off, call.args[0]).to.be.calledWith(call.args[0], call.args[1]);
                    }
                });

            });

            describe('$node', function() {

                it('should unbind delegated events once', function() {
                    expect(this.view.$node.off.callCount).to.be.equal(3);
                });

                it('should unbind delegated events properly', function() {
                    var bind = this.view.$node.on;
                    for (var i = 0; i < bind.callCount; i++) {
                        var call = bind.getCall(i);
                        expect(this.view.$node.off, call.args[0]).to.be.calledWith(call.args[0], call.args[1]);
                    }
                });

                it('should call find for non-delegated scroll event', function() {
                    expect(this.view.$node.find.calledWith('.foo-init')).to.be.equal(true);
                });

                it('should unbind non-delegated scroll event', function() {
                    expect(this.findOffSpy).to.be.calledWith('scroll');
                });

            });

            describe('custom ns.events', function() {

                it('should unbind one event handler', function() {
                    expect(ns.events.off).to.have.callCount(1);
                });

                it('should unbind handler for "my-global-init-event@init"', function() {
                    expect(ns.events.off).have.been.calledWith('my-global-init-event');
                });

            });

        });

    });

    describe('show events', function() {

        describe('bind', function() {

            beforeEach(function() {
                this.view._bindEvents('show');
            });

            describe('window', function() {

                it('should bind 2 events', function() {
                    expect(this.view._$window.on.calledTwice).to.be.equal(true);
                });

                it('should bind scroll event', function() {
                    expect(this.view._$window.on).to.be.calledWith('click');
                });

                it('should bind resize event', function() {
                    expect(this.view._$window.on).to.be.calledWith('mousedown');
                });

            });

            describe('document', function() {

                it('should bind 2 events', function() {
                    expect(this.view._$document.on.calledTwice).to.be.equal(true);
                });

                it('should bind scroll event', function() {
                    expect(this.view._$document.on).to.be.calledWith('click');
                });

                it('should bind resize event', function() {
                    expect(this.view._$document.on).to.be.calledWith('mousedown');
                });

            });

            describe('$node', function() {

                it('should bind 3 delegated events', function() {
                    expect(this.view.$node.on.callCount).to.be.equal(3);
                });

                it('should bind scroll', function() {
                    expect(this.view.$node.on).to.be.calledWith('scroll');
                });

                it('should bind mousedown without selector', function() {
                    expect(this.view.$node.on).to.be.calledWith('mousedown');
                });

                it('should bind click with selector', function() {
                    expect(this.view.$node.on).to.be.calledWith('click', '.bar-show');
                });

                it('should bind 1 non-delegated events', function() {
                    expect(this.findOnSpy.calledOnce).to.be.equal(true);
                });

                it('should call find for non-delegated scroll event', function() {
                    expect(this.view.$node.find.calledWith('.foo-show')).to.be.equal(true);
                });

                it('should bind non-delegated scroll event', function() {
                    expect(this.findOnSpy).to.be.calledWith('scroll');
                });

            });

            describe('custom ns.events', function() {

                it('should bind two event handlers', function() {
                    expect(ns.events.on).to.have.callCount(2);
                });

                it('should bind handler for "my-global-show-event-short"', function() {
                    expect(ns.events.on).have.been.calledWith('my-global-show-event-short');
                });

                it('should bind handler for "my-global-show-event@show"', function() {
                    expect(ns.events.on).have.been.calledWith('my-global-show-event');
                });

            });

        });

        describe('unbind', function() {

            beforeEach(function() {
                this.view._bindEvents('show');
                this.view._unbindEvents('show');
            });

            describe('window', function() {

                it('should call unbind once', function() {
                    expect(this.view._$window.off).to.have.callCount(2);
                });

                it('should unbind events properly', function() {
                    var bind = this.view._$window.on;
                    for (var i = 0; i < bind.callCount; i++) {
                        var call = bind.getCall(i);
                        expect(this.view._$window.off, call.args[0]).to.be.calledWith(call.args[0], call.args[1]);
                    }
                });

            });

            describe('document', function() {

                it('should call unbind once', function() {
                    expect(this.view._$document.off).to.have.callCount(2);
                });

                it('should unbind events properly', function() {
                    var bind = this.view._$document.on;
                    for (var i = 0; i < bind.callCount; i++) {
                        var call = bind.getCall(i);
                        expect(this.view._$document.off, call.args[0]).to.be.calledWith(call.args[0], call.args[1]);
                    }
                });

            });

            describe('$node', function() {

                it('should unbind delegated events once', function() {
                    expect(this.view.$node.off).to.have.callCount(3);
                });

                it('should unbind delegated events properly', function() {
                    var bind = this.view.$node.on;
                    for (var i = 0; i < bind.callCount; i++) {
                        var call = bind.getCall(i);
                        expect(this.view.$node.off, call.args[0]).to.be.calledWith(call.args[0], call.args[1]);
                    }
                });

                it('should call find for non-delegated scroll event', function() {
                    expect(this.view.$node.find).to.be.calledWith('.foo-show');
                });

                it('should unbind non-delegated scroll event', function() {
                    expect(this.findOffSpy).to.be.calledWith('scroll');
                });
            });

            describe('custom ns.events', function() {

                it('should unbind two event handlers', function() {
                    expect(ns.events.off).to.have.callCount(2);
                });

                it('should unbind handler for "my-global-show-event-short"', function() {
                    expect(ns.events.off).have.been.calledWith('my-global-show-event-short');
                });

                it('should unbind handler for "my-global-show-event@show"', function() {
                    expect(ns.events.off).have.been.calledWith('my-global-show-event');
                });

            });

        });

    });

});
