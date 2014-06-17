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
                // doochik: буээээ, не знаю как нормально сделать :(
                this.eventNS = this.view._eventNS + '-init';
            });

            afterEach(function() {
                delete this.eventNS;
            });

            describe('window', function() {

                it('should bind 2 events', function() {
                    expect(this.view._$window.on.calledTwice).to.be.equal(true);
                });

                it('should bind scroll event', function() {
                    expect(this.view._$window.on.calledWith('scroll' + this.eventNS)).to.be.equal(true);
                });

                it('should bind resize event', function() {
                    expect(this.view._$window.on.calledWith('resize' + this.eventNS)).to.be.equal(true);
                });

            });

            describe('document', function() {

                it('should bind 2 events', function() {
                    expect(this.view._$document.on.calledTwice).to.be.equal(true);
                });

                it('should bind scroll event', function() {
                    expect(this.view._$document.on.calledWith('scroll' + this.eventNS)).to.be.equal(true);
                });

                it('should bind resize event', function() {
                    expect(this.view._$document.on.calledWith('resize' + this.eventNS)).to.be.equal(true);
                });

            });

            describe('$node', function() {

                it('should bind 3 delegated events', function() {
                    expect(this.view.$node.on.callCount).to.be.equal(3);
                });

                it('should bind scroll', function() {
                    expect(this.view.$node.on.calledWith('scroll' + this.eventNS)).to.be.equal(true);
                });

                it('should bind mousedown without selector', function() {
                    expect(this.view.$node.on.calledWith('mousedown' + this.eventNS)).to.be.equal(true);
                });

                it('should bind click with selector', function() {
                    expect(this.view.$node.on.calledWith('click' + this.eventNS, '.bar-init')).to.be.equal(true);
                });

                it('should bind 1 non-delegated events', function() {
                    expect(this.findOnSpy.calledOnce).to.be.equal(true);
                });

                it('should call find for non-delegated scroll event', function() {
                    expect(this.view.$node.find.calledWith('.foo-init')).to.be.equal(true);
                });

                it('should bind non-delegated scroll event', function() {
                    expect(this.findOnSpy.calledWith('scroll' + this.eventNS)).to.be.equal(true);
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
                this.view._unbindEvents('init');
                // doochik: буээээ, не знаю как нормально сделать :(
                this.eventNS = this.view._eventNS + '-init';
            });

            afterEach(function() {
                delete this.eventNS;
            });

            describe('window', function() {

                it('should call unbind once', function() {
                    expect(this.view._$window.off.calledOnce).to.be.equal(true);
                });

                it('should unbind events by namespace', function() {
                    expect(this.view._$window.off.calledWith(this.eventNS)).to.be.equal(true);
                });

            });

            describe('document', function() {

                it('should call unbind once', function() {
                    expect(this.view._$document.off.calledOnce).to.be.equal(true);
                });

                it('should unbind events by namespace', function() {
                    expect(this.view._$document.off.calledWith(this.eventNS)).to.be.equal(true);
                });

            });

            describe('$node', function() {

                it('should unbind delegated events once', function() {
                    expect(this.view.$node.off.callCount).to.be.equal(1);
                });

                it('should unbind delegated events by namespace', function() {
                    expect(this.view.$node.off.calledWith(this.eventNS)).to.be.equal(true);
                });

                it('should call find for non-delegated scroll event', function() {
                    expect(this.view.$node.find.calledWith('.foo-init')).to.be.equal(true);
                });

                it('should unbind non-delegated scroll event', function() {
                    expect(this.findOffSpy.calledWith(this.eventNS)).to.be.equal(true);
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
                // doochik: буээээ, не знаю как нормально сделать :(
                this.eventNS = this.view._eventNS + '-show';
            });

            afterEach(function() {
                delete this.eventNS;
            });

            describe('window', function() {

                it('should bind 2 events', function() {
                    expect(this.view._$window.on.calledTwice).to.be.equal(true);
                });

                it('should bind scroll event', function() {
                    expect(this.view._$window.on.calledWith('click' + this.eventNS)).to.be.equal(true);
                });

                it('should bind resize event', function() {
                    expect(this.view._$window.on.calledWith('mousedown' + this.eventNS)).to.be.equal(true);
                });

            });

            describe('document', function() {

                it('should bind 2 events', function() {
                    expect(this.view._$document.on.calledTwice).to.be.equal(true);
                });

                it('should bind scroll event', function() {
                    expect(this.view._$document.on.calledWith('click' + this.eventNS)).to.be.equal(true);
                });

                it('should bind resize event', function() {
                    expect(this.view._$document.on.calledWith('mousedown' + this.eventNS)).to.be.equal(true);
                });

            });

            describe('$node', function() {

                it('should bind 3 delegated events', function() {
                    expect(this.view.$node.on.callCount).to.be.equal(3);
                });

                it('should bind scroll', function() {
                    expect(this.view.$node.on.calledWith('scroll' + this.eventNS)).to.be.equal(true);
                });

                it('should bind mousedown without selector', function() {
                    expect(this.view.$node.on.calledWith('mousedown' + this.eventNS)).to.be.equal(true);
                });

                it('should bind click with selector', function() {
                    expect(this.view.$node.on.calledWith('click' + this.eventNS, '.bar-show')).to.be.equal(true);
                });

                it('should bind 1 non-delegated events', function() {
                    expect(this.findOnSpy.calledOnce).to.be.equal(true);
                });

                it('should call find for non-delegated scroll event', function() {
                    expect(this.view.$node.find.calledWith('.foo-show')).to.be.equal(true);
                });

                it('should bind non-delegated scroll event', function() {
                    expect(this.findOnSpy.calledWith('scroll' + this.eventNS)).to.be.equal(true);
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
                this.view._unbindEvents('show');
                // doochik: буээээ, не знаю как нормально сделать :(
                this.eventNS = this.view._eventNS + '-show';
            });

            afterEach(function() {
                delete this.eventNS;
            });

            describe('window', function() {

                it('should call unbind once', function() {
                    expect(this.view._$window.off.calledOnce).to.be.equal(true);
                });

                it('should unbind events by namespace', function() {
                    expect(this.view._$window.off.calledWith(this.eventNS)).to.be.equal(true);
                });

            });

            describe('document', function() {

                it('should call unbind once', function() {
                    expect(this.view._$document.off.calledOnce).to.be.equal(true);
                });

                it('should unbind events by namespace', function() {
                    expect(this.view._$document.off.calledWith(this.eventNS)).to.be.equal(true);
                });

            });

            describe('$node', function() {

                it('should unbind delegated events once', function() {
                    expect(this.view.$node.off.callCount).to.be.equal(1);
                });

                it('should unbind delegated events by namespace', function() {
                    expect(this.view.$node.off.calledWith(this.eventNS)).to.be.equal(true);
                });

                it('should call find for non-delegated scroll event', function() {
                    expect(this.view.$node.find.calledWith('.foo-show')).to.be.equal(true);
                });

                it('should unbind non-delegated scroll event', function() {
                    expect(this.findOffSpy.calledWith(this.eventNS)).to.be.equal(true);
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

describe('ns.View bind events2', function() {

    describe('bind global events with uniq namespace', function() {

        beforeEach(function(cb) {
            this.sinon.stub($.fn, 'on', no.nop);
            this.sinon.stub($.fn, 'off', no.nop);

            // creates 2 layouts with same view in different boxes
            ns.layout.define('page1', {
                'app': {
                    'content@': {
                        'page1-box@': {
                            'view1': true
                        }
                    }
                }
            });

            ns.layout.define('page2', {
                'app': {
                    'content@': {
                        'page2-box@': {
                            'view1': true
                        }
                    }
                }
            });

            ns.View.define('app');

            // view1 has global scroll event
            ns.View.define('view1', {
                events: {
                    'scroll window': no.nop
                }
            });

            var app = ns.View.create('app');

            var params = {};
            var layout1 = ns.layout.page('page1', params);
            var layout2 = ns.layout.page('page2', params);

            new ns.Update(app, layout1, params)
                .start()
                .then(function() {

                    new ns.Update(app, layout2, params)
                        .start()
                        .then(function() {
                            cb();
                        });

                });
        });

        it('should bind global events with different namespace', function() {
            var view1Event = $.fn.on.getCall(0).args[0];
            var view2Event = $.fn.on.getCall(1).args[0];

            expect(view1Event).to.not.equal(view2Event);
        })

    });

});
