describe('ns.View.events', function() {

    function genTests(defs) {
        for (var i = 0, j = defs.length; i < j; i++) {
            var def = defs[i];
            (function(view, event, check, not) {
                it('should ' + (not == false ? 'not ': '') + ' trigger "' + event + '" for "' + view + '" (' + check + ')', function() {
                    var spyName = view + '-' + event + '-spy';
                    if (not === false) {
                        expect(this.events[spyName][check]).to.be.equal(false);
                    } else {
                        expect(this.events[spyName][check]).to.be.equal(true);
                    }
                });
            })(def[0], def[1], def[2], def[3]);

        }
    }

    function genOrderTests(defs) {
        for (var i = 0, j = defs.length - 1; i < j; i++) {
            var def = defs[i];
            var defNext = defs[i + 1];
            (function(view, event, pos, nextView, nextEvent, nextPos) {
                it('should trigger "'+event+'" for "'+view+'" before "'+nextEvent+'" for "'+nextView+'" ', function() {
                    var spyName = view + '-' + event + '-spy';
                    var nextSpyName = nextView + '-' + nextEvent + '-spy';

                    var spy = this.events[spyName];
                    if (typeof pos == 'number') {
                        spy = spy.getCall(pos);
                    }

                    var nextSpy = this.events[nextSpyName];
                    if (typeof nextPos == 'number') {
                        nextSpy = nextSpy.getCall(nextPos);
                    }

                    expect(spy.calledBefore(nextSpy)).to.be.equal(true);
                });
            })(def[0], def[1], def[2], defNext[0], defNext[1], defNext[2]);

        }
    }

    beforeEach(function() {
        ns.layout.define('app', {
            'app': {
                'head': true,
                'content@': true
            }
        });

        ns.layout.define('content1', {
            'app content@': {
                'content1': {
                    'content1-inner': true
                }
            }
        }, 'app');

        ns.layout.define('content2', {
            'app content@': {
                'content2': {
                    'content2-inner': true
                }
            }
        }, 'app');

        var views = ['app', 'head', 'content1', 'content1-async@content1-async-model', 'content2-async@content2-async-model', 'content1-inner', 'content2', 'content2-inner'];
        var events = ['ns-view-async', 'ns-view-init', 'ns-view-htmlinit', 'ns-view-show', 'ns-view-touch', 'ns-view-hide', 'ns-view-htmldestroy'];

        this.events = {};

        for (var i = 0, j = views.length; i < j; i++) {
            var viewDecl = views[i].split('@');
            var view = viewDecl[0];
            var model = viewDecl[1];

            var eventsDecl = {};
            for (var k = 0, l = events.length; k < l; k++) {
                var event = events[k];
                var spy = this.sinon.spy();

                eventsDecl[event + ' .'] = spy;
                this.events[view + '-' + event + '-spy'] = spy
            }

            ns.View.define(view, {
                events: eventsDecl,
                models: model ? [model] : []
            });
        }

        /**
         *
         * @type {ns.View}
         */
        this.APP = ns.View.create('app');
    });

    afterEach(function() {
        delete this.events;
        delete this.APP;
    });

    describe('first rendering', function() {

        beforeEach(function(done) {
            var layout = ns.layout.page('content1', {});
            var update = new ns.Update(this.APP, layout, {});
            update.start().then(function() {
                done();
            }.bind(this));
        });

        describe('ns-view-init', function() {
            genTests([
                ['app', 'ns-view-init', 'calledOnce'],
                ['head', 'ns-view-init', 'calledOnce'],
                ['content1', 'ns-view-init', 'calledOnce'],
                ['content1-inner', 'ns-view-init', 'calledOnce'],
                ['content2', 'ns-view-init', 'called', false],
                ['content2-inner', 'ns-view-init', 'called', false]
            ]);
        });

        describe('ns-view-htmlinit', function() {
            genTests([
                ['app', 'ns-view-htmlinit', 'calledOnce'],
                ['head', 'ns-view-htmlinit', 'calledOnce'],
                ['content1', 'ns-view-htmlinit', 'calledOnce'],
                ['content1-inner', 'ns-view-htmlinit', 'calledOnce'],
                ['content2', 'ns-view-htmlinit', 'called', false],
                ['content2-inner', 'ns-view-htmlinit', 'called', false]
            ]);
        });

        describe('ns-view-show', function() {
            genTests([
                ['app', 'ns-view-show', 'calledOnce'],
                ['head', 'ns-view-show', 'calledOnce'],
                ['content1', 'ns-view-show', 'calledOnce'],
                ['content1-inner', 'ns-view-show', 'calledOnce'],
                ['content2', 'ns-view-show', 'called', false],
                ['content2-inner', 'ns-view-show', 'called', false]
            ]);
        });

        describe('ns-view-touch', function() {
            genTests([
                ['app', 'ns-view-touch', 'calledOnce'],
                ['head', 'ns-view-touch', 'calledOnce'],
                ['content1', 'ns-view-touch', 'calledOnce'],
                ['content1-inner', 'ns-view-touch', 'calledOnce'],
                ['content2', 'ns-view-touch', 'called', false],
                ['content2-inner', 'ns-view-touch', 'called', false]
            ]);
        });

        describe('ns-view-hide', function() {
            genTests([
                ['app', 'ns-view-hide', 'called', false],
                ['head', 'ns-view-hide', 'called', false],
                ['content1', 'ns-view-hide', 'called', false],
                ['content1-inner', 'ns-view-hide', 'called', false],
                ['content2', 'ns-view-hide', 'called', false],
                ['content2-inner', 'ns-view-hide', 'called', false]
            ]);
        });

        describe('ns-view-htmldestroy', function() {
            genTests([
                ['app', 'ns-view-htmldestroy', 'called', false],
                ['head', 'ns-view-htmldestroy', 'called', false],
                ['content1', 'ns-view-htmldestroy', 'called', false],
                ['content1-inner', 'ns-view-htmldestroy', 'called', false],
                ['content2', 'ns-view-htmldestroy', 'called', false],
                ['content2-inner', 'ns-view-htmldestroy', 'called', false]
            ]);
        });

        describe('order', function() {
            genOrderTests([
                ['content1-inner', 'ns-view-htmlinit'],
                ['content1', 'ns-view-htmlinit'],
                ['head', 'ns-view-htmlinit'],
                ['app', 'ns-view-htmlinit'],

                ['content1-inner', 'ns-view-show'],
                ['content1', 'ns-view-show'],
                ['head', 'ns-view-show'],
                ['app', 'ns-view-show'],

                ['content1-inner', 'ns-view-touch'],
                ['content1', 'ns-view-touch'],
                ['head', 'ns-view-touch'],
                ['app', 'ns-view-touch']
            ]);
        });

    });

    describe('change view in box', function() {

        beforeEach(function(done) {
            var layout = ns.layout.page('content1', {});
            new ns.Update(this.APP, layout, {}).start().then(function() {
                layout = ns.layout.page('content2', {});
                new ns.Update(this.APP, layout, {}).start().then(function() {
                    done();
                });
            }.bind(this));


        });

        genTests([

            ['content2-inner', 'ns-view-init', 'calledOnce'],
            ['content2-inner', 'ns-view-htmlinit', 'calledOnce'],
            ['content2-inner', 'ns-view-show', 'calledOnce'],
            ['content2-inner', 'ns-view-touch', 'calledOnce'],

            ['content2', 'ns-view-init', 'calledOnce'],
            ['content2', 'ns-view-htmlinit', 'calledOnce'],
            ['content2', 'ns-view-show', 'calledOnce'],
            ['content2', 'ns-view-touch', 'calledOnce'],

            ['app', 'ns-view-show', 'calledOnce'],
            ['content1-inner', 'ns-view-hide', 'calledOnce'],
            ['content1', 'ns-view-hide', 'calledOnce'],

            ['app', 'ns-view-touch', 'calledTwice'],
            ['head', 'ns-view-touch', 'calledTwice'],
            ['content1', 'ns-view-touch', 'calledOnce'],
            ['content1-inner', 'ns-view-touch', 'calledOnce'],
            ['content2', 'ns-view-touch', 'calledOnce'],
            ['content2-inner', 'ns-view-touch', 'calledOnce']
        ]);

        describe('order', function() {
            genOrderTests([
                ['content1-inner', 'ns-view-htmlinit', 0],
                ['content1', 'ns-view-htmlinit', 0],
                ['head', 'ns-view-htmlinit', 0],
                ['app', 'ns-view-htmlinit', 0],

                ['content1-inner', 'ns-view-show', 0],
                ['content1', 'ns-view-show', 0],
                ['head', 'ns-view-show', 0],
                ['app', 'ns-view-show', 0],

                ['content1-inner', 'ns-view-touch', 0],
                ['content1', 'ns-view-touch', 0],
                ['head', 'ns-view-touch', 0],
                ['app', 'ns-view-touch', 0],

                ['content1-inner', 'ns-view-hide', 0],
                ['content1', 'ns-view-hide', 0],

                ['content2-inner', 'ns-view-htmlinit', 0],
                ['content2', 'ns-view-htmlinit', 0],
                ['content2-inner', 'ns-view-show', 0],
                ['content2', 'ns-view-show', 0],

                ['content2-inner', 'ns-view-touch', 0],
                ['content2', 'ns-view-touch', 0],
                ['head', 'ns-view-touch', 1],
                ['app', 'ns-view-touch', 1]
            ]);
        });
    });

    describe('redraw valid view', function() {

        beforeEach(function(done) {
            var that = this;
            var layout = ns.layout.page('content1', {});
            new ns.Update(this.APP, layout, {}).start().then(function() {
                new ns.Update(that.APP, layout, {}).start().then(function() {
                    done();
                });
            });

        });

        describe('events', function() {
            genTests([
                ['content1-inner', 'ns-view-hide', 'called', false],
                ['content1', 'ns-view-hide', 'called', false],

                ['content1-inner', 'ns-view-htmldestroy', 'called', false],
                ['content1', 'ns-view-htmldestroy', 'called', false],

                ['content1-inner', 'ns-view-htmlinit', 'calledOnce'],
                ['content1', 'ns-view-htmlinit', 'calledOnce'],

                ['content1-inner', 'ns-view-show', 'calledOnce'],
                ['content1', 'ns-view-show', 'calledOnce'],

                ['content1-inner', 'ns-view-touch', 'calledTwice'],
                ['content1', 'ns-view-touch', 'calledTwice']
            ]);
        });

    });

    describe('redraw invalidated view', function() {

        beforeEach(function(done) {
            var layout = ns.layout.page('content1', {});
            new ns.Update(this.APP, layout, {}).start().then(function() {
                /**
                 * @type {ns.View}
                 */
                var vContent1 = this.events['content1-ns-view-init-spy'].getCall(0).thisValue;
                vContent1.invalidate();

                layout = ns.layout.page('content1', {});
                new ns.Update(this.APP, layout, {}).start().then(function() {
                    done();
                });
            }.bind(this));
        });

        describe('events', function() {
            genTests([
                ['content1-inner', 'ns-view-hide', 'calledOnce'],
                ['content1', 'ns-view-hide', 'calledOnce'],

                ['content1-inner', 'ns-view-htmldestroy', 'calledOnce'],
                ['content1', 'ns-view-htmldestroy', 'calledOnce'],

                ['content1-inner', 'ns-view-htmlinit', 'calledTwice'],
                ['content1', 'ns-view-htmlinit', 'calledTwice'],

                ['content1-inner', 'ns-view-show', 'calledTwice'],
                ['content1', 'ns-view-show', 'calledTwice'],

                ['content1-inner', 'ns-view-touch', 'calledTwice'],
                ['content1', 'ns-view-touch', 'calledTwice']
            ]);
        });

        describe('order', function() {
            genOrderTests([
                ['content1-inner', 'ns-view-htmlinit', 0],
                ['content1', 'ns-view-htmlinit', 0],
                ['head', 'ns-view-htmlinit', 0],
                ['app', 'ns-view-htmlinit', 0],

                ['content1-inner', 'ns-view-show', 0],
                ['content1', 'ns-view-show', 0],
                ['head', 'ns-view-show', 0],
                ['app', 'ns-view-show', 0],

                ['content1-inner', 'ns-view-touch', 0],
                ['content1', 'ns-view-touch', 0],
                ['head', 'ns-view-touch', 0],
                ['app', 'ns-view-touch', 0],

                ['content1-inner', 'ns-view-hide', 0],
                ['content1', 'ns-view-hide', 0],

                ['content1-inner', 'ns-view-htmldestroy', 0],
                ['content1', 'ns-view-htmldestroy', 0],

                ['content1-inner', 'ns-view-htmlinit', 1],
                ['content1', 'ns-view-htmlinit', 1],
                ['content1-inner', 'ns-view-show', 1],
                ['content1', 'ns-view-show', 1],

                ['content1-inner', 'ns-view-touch', 1],
                ['content1', 'ns-view-touch', 1],
                ['head', 'ns-view-touch', 1],
                ['app', 'ns-view-touch', 1]
            ]);
        });
    });

    describe('ns-view-async', function() {

        beforeEach(function(done) {
            ns.layout.define('content1-async', {
                'app content@': {
                    'content1-async&': {
                        'content1-inner': true
                    }
                }
            }, 'app');

            ns.Model.define('content1-async-model');

            var layout = ns.layout.page('content1-async', {});
            new ns.Update(this.APP, layout, {}).start().then(function() {
                done();
            });
        });

        describe('first pass', function() {
            describe('events', function() {
                genTests([
                    ['content1-async', 'ns-view-async', 'calledOnce'],

                    ['content1-async', 'ns-view-htmldestroy', 'called', false],
                    ['content1-async', 'ns-view-hide', 'called', false],
                    ['content1-async', 'ns-view-htmlinit', 'called', false],
                    ['content1-async', 'ns-view-show', 'called', false],
                    ['content1-async', 'ns-view-touch', 'called', false],

                    ['content1-inner', 'ns-view-htmldestroy', 'called', false],
                    ['content1-inner', 'ns-view-hide', 'called', false],
                    ['content1-inner', 'ns-view-htmlinit', 'called', false],
                    ['content1-inner', 'ns-view-show', 'called', false],
                    ['content1-inner', 'ns-view-touch', 'called', false]
                ])
            });

            describe('order', function() {
                genOrderTests([
                    ['head', 'ns-view-htmlinit', 0],
                    ['app', 'ns-view-htmlinit', 0],

                    ['content1-async', 'ns-view-async', 0],

                    ['head', 'ns-view-show', 0],
                    ['app', 'ns-view-show', 0],

                    ['head', 'ns-view-touch', 0],
                    ['app', 'ns-view-touch', 0]
                ]);
            });
        });

        describe('second pass', function() {

            beforeEach(function(done) {
                this.sinon.server.requests[0].respond(
                    200,
                    {"Content-Type": "application/json"},
                    JSON.stringify({
                        models: [
                            {data: true}
                        ]
                    })
                );

                window.setTimeout(function() {
                    done();
                }, 50)
            });

            describe('events', function() {
                genTests([
                    ['content1-async', 'ns-view-async', 'calledOnce'],

                    ['content1-async', 'ns-view-htmlinit', 'calledOnce'],
                    ['content1-async', 'ns-view-show', 'calledOnce'],
                    ['content1-async', 'ns-view-touch', 'calledOnce'],

                    ['content1-inner', 'ns-view-htmlinit', 'calledOnce'],
                    ['content1-inner', 'ns-view-show', 'calledOnce'],
                    ['content1-inner', 'ns-view-touch', 'calledOnce'],

                    ['head', 'ns-view-touch', 'calledOnce'],
                    ['app', 'ns-view-touch', 'calledOnce'],

                    ['content1-async', 'ns-view-htmldestroy', 'called', false],
                    ['content1-inner', 'ns-view-htmldestroy', 'called', false]
                ])
            });

            describe('order', function() {
                genOrderTests([
                    ['head', 'ns-view-htmlinit', 0],
                    ['app', 'ns-view-htmlinit', 0],

                    ['content1-async', 'ns-view-async', 0],

                    ['head', 'ns-view-show', 0],
                    ['app', 'ns-view-show', 0],

                    ['head', 'ns-view-touch', 0],
                    ['app', 'ns-view-touch', 0],

                    ['content1-inner', 'ns-view-htmlinit', 0],
                    ['content1-async', 'ns-view-htmlinit', 0],

                    ['content1-inner', 'ns-view-show', 0],
                    ['content1-async', 'ns-view-show', 0],

                    ['content1-inner', 'ns-view-touch', 0],
                    ['content1-async', 'ns-view-touch', 0]
                ]);
            })
        });

    });

    describe('ns-view-async 2', function() {

        beforeEach(function(done) {
            ns.layout.define('content2-async', {
                'app content@': {
                    'content2-inner': {
                        'content2-async&': true
                    }
                }
            }, 'app');

            ns.Model.define('content2-async-model');

            var that = this;
            var layout = ns.layout.page('content2-async', {});
            new ns.Update(this.APP, layout, {}).start().then(function(result) {
                that.asyncPromise1 = result.async[0];
                done();
            });
        });

        describe('first pass', function() {
            describe('events', function() {
                genTests([
                    ['content2-inner', 'ns-view-htmldestroy', 'called', false],
                    ['content2-inner', 'ns-view-hide', 'called', false],
                    ['content2-inner', 'ns-view-htmlinit', 'calledOnce'],
                    ['content2-inner', 'ns-view-show', 'calledOnce'],
                    ['content2-inner', 'ns-view-touch', 'calledOnce'],

                    ['content2-async', 'ns-view-async', 'calledOnce'],
                    ['content2-async', 'ns-view-htmldestroy', 'called', false],
                    ['content2-async', 'ns-view-hide', 'called', false],
                    ['content2-async', 'ns-view-htmlinit', 'called', false],
                    ['content2-async', 'ns-view-show', 'called', false],
                    ['content2-async', 'ns-view-touch', 'called', false]
                ]);
            });

            describe('order', function() {
                genOrderTests([
                    ['content2-inner', 'ns-view-htmlinit', 0],
                    ['head', 'ns-view-htmlinit', 0],
                    ['app', 'ns-view-htmlinit', 0],

                    ['content2-async', 'ns-view-async', 0],

                    ['content2-inner', 'ns-view-show', 0],
                    ['head', 'ns-view-show', 0],
                    ['app', 'ns-view-show', 0],

                    ['content2-inner', 'ns-view-touch', 0],
                    ['head', 'ns-view-touch', 0],
                    ['app', 'ns-view-touch', 0]
                ]);
            });
        });

        describe('second pass', function() {

            beforeEach(function() {
                this.sinon.server.requests[0].respond(
                    200,
                    {"Content-Type": "application/json"},
                    JSON.stringify({
                        models: [
                            {data: true}
                        ]
                    })
                );

                return this.asyncPromise1;
            });

            describe('events', function() {
                genTests([
                    ['content2-inner', 'ns-view-htmldestroy', 'called', false],
                    ['content2-inner', 'ns-view-hide', 'called', false],
                    ['content2-inner', 'ns-view-htmlinit', 'calledOnce'],
                    ['content2-inner', 'ns-view-show', 'calledOnce'],
                    ['content2-inner', 'ns-view-touch', 'calledOnce'],

                    ['content2-async', 'ns-view-async', 'calledOnce'],
                    ['content2-async', 'ns-view-htmldestroy', 'called', false],
                    ['content2-async', 'ns-view-hide', 'called', false],
                    ['content2-async', 'ns-view-htmlinit', 'calledOnce'], // +1
                    ['content2-async', 'ns-view-show', 'calledOnce'], // +1
                    ['content2-async', 'ns-view-touch', 'calledOnce'] // +1
                ]);
            });

            describe('order', function() {
                genOrderTests([
                    ['content2-inner', 'ns-view-htmlinit', 0],
                    ['head', 'ns-view-htmlinit', 0],
                    ['app', 'ns-view-htmlinit', 0],

                    ['content2-async', 'ns-view-async', 0],

                    ['content2-inner', 'ns-view-show', 0],
                    ['head', 'ns-view-show', 0],
                    ['app', 'ns-view-show', 0],

                    ['content2-inner', 'ns-view-touch', 0],
                    ['head', 'ns-view-touch', 0],
                    ['app', 'ns-view-touch', 0],

                    // После того, как отрендерился content2-async
                    ['content2-async', 'ns-view-htmlinit', 0],
                    ['content2-async', 'ns-view-show', 0],
                    ['content2-async', 'ns-view-touch', 0]
                ]);
            });
        });

        describe('third phase (new update: first phase)', function() {

            beforeEach(function(done) {
                var that = this;

                this.sinon.server.requests[0].respond(
                    200,
                    {"Content-Type": "application/json"},
                    JSON.stringify({
                        models: [
                            {data: true}
                        ]
                    })
                );

                this.asyncPromise1.then(function() {
                    ns.Model.get('content2-async-model').invalidate();

                    var layout = ns.layout.page('content2-async', {});
                    new ns.Update(that.APP, layout, {}).start().then(function(result) {
                        that.asyncPromise2 = result.async[0];
                        done();
                    });
                });
            });

            describe('events', function() {
                genTests([
                    ['content2-inner', 'ns-view-htmldestroy', 'called', false],
                    ['content2-inner', 'ns-view-hide', 'called', false],
                    ['content2-inner', 'ns-view-htmlinit', 'calledOnce'],
                    ['content2-inner', 'ns-view-show', 'calledOnce'],
                    ['content2-inner', 'ns-view-touch', 'calledTwice'], // +1 показ

                    ['content2-async', 'ns-view-async', 'calledTwice'], // +1 новый async рендеринг
                    ['content2-async', 'ns-view-htmldestroy', 'calledOnce'], // +1 async вид перерисовался и теперь loading
                    ['content2-async', 'ns-view-hide', 'calledOnce'], // +1 async вид был спрятан (отрендерили async заглушку)
                    ['content2-async', 'ns-view-htmlinit', 'calledOnce'],
                    ['content2-async', 'ns-view-show', 'calledOnce'],
                    ['content2-async', 'ns-view-touch', 'calledOnce']
                ]);
            });

            describe('order', function() {
                genOrderTests([
                    ['content2-inner', 'ns-view-htmlinit', 0],
                    ['head', 'ns-view-htmlinit', 0],
                    ['app', 'ns-view-htmlinit', 0],

                    ['content2-async', 'ns-view-async', 0],

                    ['content2-inner', 'ns-view-show', 0],
                    ['head', 'ns-view-show', 0],
                    ['app', 'ns-view-show', 0],

                    ['content2-inner', 'ns-view-touch', 0],
                    ['head', 'ns-view-touch', 0],
                    ['app', 'ns-view-touch', 0],

                    ['content2-async', 'ns-view-htmlinit', 0],
                    ['content2-async', 'ns-view-show', 0],
                    ['content2-async', 'ns-view-touch', 0],

                    // Второй update отсюда
                    ['content2-async', 'ns-view-hide', 0],
                    ['content2-async', 'ns-view-htmldestroy', 0],

                    ['content2-async', 'ns-view-async', 1],
                    ['content2-inner', 'ns-view-touch', 1]
                ]);
            });
        });

        describe('fourth phase (new update: second phase)', function() {

            beforeEach(function(done) {
                var that = this;

                this.sinon.server.requests[0].respond(
                    200,
                    {"Content-Type": "application/json"},
                    JSON.stringify({
                        models: [
                            {data: true}
                        ]
                    })
                );

                this.asyncPromise1.then(function() {
                    ns.Model.get('content2-async-model').invalidate();

                    var layout = ns.layout.page('content2-async', {});
                    new ns.Update(that.APP, layout, {}).start().then(function(result) {

                        that.sinon.server.requests[1].respond(
                            200,
                            {"Content-Type": "application/json"},
                            JSON.stringify({
                                models: [
                                    {data: true}
                                ]
                            })
                        );

                        result.async[0].then(function() {
                            done();
                        });
                    });
                });
            });

            describe('events', function() {
                genTests([
                    ['content2-inner', 'ns-view-htmldestroy', 'called', false],
                    ['content2-inner', 'ns-view-hide', 'called', false],
                    ['content2-inner', 'ns-view-htmlinit', 'calledOnce'],
                    ['content2-inner', 'ns-view-show', 'calledOnce'],
                    ['content2-inner', 'ns-view-touch', 'calledTwice'],

                    ['content2-async', 'ns-view-async', 'calledTwice'],
                    ['content2-async', 'ns-view-htmldestroy', 'calledOnce'],
                    ['content2-async', 'ns-view-hide', 'calledOnce'],
                    ['content2-async', 'ns-view-htmlinit', 'calledTwice'], // +1
                    ['content2-async', 'ns-view-show', 'calledTwice'], // +1
                    ['content2-async', 'ns-view-touch', 'calledTwice'] // +1
                ]);
            });

            describe('order', function() {
                genOrderTests([
                    ['content2-inner', 'ns-view-htmlinit', 0],
                    ['head', 'ns-view-htmlinit', 0],
                    ['app', 'ns-view-htmlinit', 0],

                    ['content2-async', 'ns-view-async', 0],

                    ['content2-inner', 'ns-view-show', 0],
                    ['head', 'ns-view-show', 0],
                    ['app', 'ns-view-show', 0],

                    ['content2-inner', 'ns-view-touch', 0],
                    ['head', 'ns-view-touch', 0],
                    ['app', 'ns-view-touch', 0],

                    ['content2-async', 'ns-view-htmlinit', 0],
                    ['content2-async', 'ns-view-show', 0],
                    ['content2-async', 'ns-view-touch', 0],

                    ['content2-async', 'ns-view-hide', 0],
                    ['content2-async', 'ns-view-htmldestroy', 0],

                    ['content2-async', 'ns-view-async', 1],
                    ['content2-inner', 'ns-view-touch', 1],

                    ['content2-async', 'ns-view-htmlinit', 1],
                    ['content2-async', 'ns-view-show', 1],
                    ['content2-async', 'ns-view-touch', 1]
                ]);
            });
        });

    });

    describe('"ns-view-hide" и "ns-view-htmldestroy" вызываются на старой ноде', function() {

        // Этот тест проверяет, что при перерисовке вида в событиях ns-view-hide и ns-view-htmldestroy доступна старая нода
        // Без этого будут большие утечки памяти, т.к. нет возможности что-то сделать со старой нодой в событиях.

        beforeEach(function() {
            var that = this;
            this.hideNodes = [];
            this.hideSpy = this.sinon.spy(function() {
                that.hideNodes.push(this.node);
            });

            this.destroyNodes = [];
            this.destroySpy = this.sinon.spy(function() {
                that.destroyNodes.push(this.node);
            });

            ns.View.define('view', {
                events: {
                    'ns-view-hide': '_onHide',
                    'ns-view-htmldestroy': '_onDestroy'
                },
                methods: {
                    _onHide: this.hideSpy,
                    _onDestroy: this.destroySpy
                }
            });

            this.view = ns.View.create('view');
            return this.view.update();
        });

        it('в ns-view-hide доступна нода до перерисовки', function() {
            var oldViewNode = this.view.node;
            this.view.invalidate();

            return this.view.update()
                .then(function() {
                    expect(this.hideNodes[0]).to.be.equal(oldViewNode);
                }, null, this);
        });

        it('в ns-view-htmldestroy доступна нода до перерисовки', function() {
            var oldViewNode = this.view.node;
            this.view.invalidate();

            return this.view.update()
                .then(function() {
                    expect(this.destroyNodes[0]).to.be.equal(oldViewNode);
                }, null, this);
        });

    });

    describe('"ns-view-hide" вызываются на старой ноде, которая еще видна', function() {

        beforeEach(function() {
            ns.log.exception.restore();
            this.sinon.stub(ns.log, 'exception', function(name, error) {
                throw error;
            });

            ns.layout.define('view1', {
                'app content@': {
                    'view1': {}
                }
            }, 'app');

            ns.layout.define('view2', {
                'app content@': {
                    'view2': {}
                }
            }, 'app');

            this.onHideSpy = this.sinon.spy(function() {
                // Не придумал как проконтроллировать этот процесс нормально,
                // так что сделал тест тут.
                // expect выкинет ошибку и тест завалится.
                expect(this.node.className).to.contain(' ns-view-visible');
            });

            ns.View.define('view1', {
                events: {
                    'ns-view-hide': this.onHideSpy
                }
            });

            ns.View.define('view2');

            var layout1 = ns.layout.page('view1', {});
            return new ns.Update(this.APP, layout1, {}).render();
        });

        it('в момент события ns-view-hide нода еще видна', function() {
            var layout2 = ns.layout.page('view2', {});
            return new ns.Update(this.APP, layout2, {}).render().then(function() {
                // это специальная проверка, что тест вообще отработал
                expect(this.onHideSpy).to.have.callCount(1);
            }, this);
        });

    });

});
