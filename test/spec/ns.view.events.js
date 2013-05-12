describe('ns.View.events', function() {

    function genTests(defs) {
        for (var i = 0, j = defs.length; i < j; i++) {
            var def = defs[i];
            (function(view, event, check, not) {
                it('should ' + (not == false ? 'not ': '') + ' trigger "' + event + '" for "' + view + '" (' + check + ')', function() {
                    var spyName = view + '-' + event + '-spy';
                    if (not === false) {
                        expect(this.events[spyName][check]).to.not.be.ok();
                    } else {
                        expect(this.events[spyName][check]).to.be.ok();
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

                    expect(spy.calledBefore(nextSpy)).to.be.ok();
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

        var views = ['app', 'head', 'content1', 'content1-async@content1-async-model', 'content1-inner', 'content2', 'content2-inner'];
        var events = ['ns-async', 'ns-init', 'ns-htmlinit', 'ns-show', 'ns-repaint', 'ns-hide', 'ns-htmldestroy'];

        this.events = {};

        for (var i = 0, j = views.length; i < j; i++) {
            var viewDecl = views[i].split('@');
            var view = viewDecl[0];
            var model = viewDecl[1];

            var eventsDecl = {};
            for (var k = 0, l = events.length; k < l; k++) {
                var event = events[k];
                var spy = sinon.spy();

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

        beforeEach(function() {
            var layout = ns.layout.page('content1', {});
            var update = new ns.Update(this.APP, layout, {});
            update.start();
        });

        describe('ns-init', function() {
            genTests([
                ['app', 'ns-init', 'calledOnce'],
                ['head', 'ns-init', 'calledOnce'],
                ['content1', 'ns-init', 'calledOnce'],
                ['content1-inner', 'ns-init', 'calledOnce'],
                ['content2', 'ns-init', 'called', false],
                ['content2-inner', 'ns-init', 'called', false]
            ]);
        });

        describe('ns-htmlinit', function() {
            genTests([
                ['app', 'ns-htmlinit', 'calledOnce'],
                ['head', 'ns-htmlinit', 'calledOnce'],
                ['content1', 'ns-htmlinit', 'calledOnce'],
                ['content1-inner', 'ns-htmlinit', 'calledOnce'],
                ['content2', 'ns-htmlinit', 'called', false],
                ['content2-inner', 'ns-htmlinit', 'called', false]
            ]);
        });

        describe('ns-show', function() {
            genTests([
                ['app', 'ns-show', 'calledOnce'],
                ['head', 'ns-show', 'calledOnce'],
                ['content1', 'ns-show', 'calledOnce'],
                ['content1-inner', 'ns-show', 'calledOnce'],
                ['content2', 'ns-show', 'called', false],
                ['content2-inner', 'ns-show', 'called', false]
            ]);
        });

        describe('ns-repaint', function() {
            genTests([
                ['app', 'ns-repaint', 'calledOnce'],
                ['head', 'ns-repaint', 'calledOnce'],
                ['content1', 'ns-repaint', 'calledOnce'],
                ['content1-inner', 'ns-repaint', 'calledOnce'],
                ['content2', 'ns-repaint', 'called', false],
                ['content2-inner', 'ns-repaint', 'called', false]
            ]);
        });

        describe('ns-hide', function() {
            genTests([
                ['app', 'ns-hide', 'called', false],
                ['head', 'ns-hide', 'called', false],
                ['content1', 'ns-hide', 'called', false],
                ['content1-inner', 'ns-hide', 'called', false],
                ['content2', 'ns-hide', 'called', false],
                ['content2-inner', 'ns-hide', 'called', false]
            ]);
        });

        describe('ns-htmldestroy', function() {
            genTests([
                ['app', 'ns-htmldestroy', 'called', false],
                ['head', 'ns-htmldestroy', 'called', false],
                ['content1', 'ns-htmldestroy', 'called', false],
                ['content1-inner', 'ns-htmldestroy', 'called', false],
                ['content2', 'ns-htmldestroy', 'called', false],
                ['content2-inner', 'ns-htmldestroy', 'called', false]
            ]);
        });

        describe('order', function() {
            genOrderTests([
                ['content1-inner', 'ns-htmlinit'],
                ['content1', 'ns-htmlinit'],
                ['head', 'ns-htmlinit'],
                ['app', 'ns-htmlinit'],

                ['content1-inner', 'ns-show'],
                ['content1', 'ns-show'],
                ['head', 'ns-show'],
                ['app', 'ns-show'],

                ['content1-inner', 'ns-repaint'],
                ['content1', 'ns-repaint'],
                ['head', 'ns-repaint'],
                ['app', 'ns-repaint']
            ]);
        });

    });

    describe('change view in box', function() {

        beforeEach(function() {
            var layout = ns.layout.page('content1', {});
            new ns.Update(this.APP, layout, {}).start();

            layout = ns.layout.page('content2', {});
            new ns.Update(this.APP, layout, {}).start();
        });

        genTests([

            ['content2-inner', 'ns-init', 'calledOnce'],
            ['content2-inner', 'ns-htmlinit', 'calledOnce'],
            ['content2-inner', 'ns-show', 'calledOnce'],
            ['content2-inner', 'ns-repaint', 'calledOnce'],

            ['content2', 'ns-init', 'calledOnce'],
            ['content2', 'ns-htmlinit', 'calledOnce'],
            ['content2', 'ns-show', 'calledOnce'],
            ['content2', 'ns-repaint', 'calledOnce'],

            ['app', 'ns-show', 'calledOnce'],
            ['content1-inner', 'ns-hide', 'calledOnce'],
            ['content1', 'ns-hide', 'calledOnce'],

            ['app', 'ns-repaint', 'calledTwice'],
            ['head', 'ns-repaint', 'calledTwice'],
            ['content1', 'ns-repaint', 'calledOnce'],
            ['content1-inner', 'ns-repaint', 'calledOnce'],
            ['content2', 'ns-repaint', 'calledOnce'],
            ['content2-inner', 'ns-repaint', 'calledOnce']
        ]);

        describe('order', function() {
            genOrderTests([
                ['content1-inner', 'ns-htmlinit', 0],
                ['content1', 'ns-htmlinit', 0],
                ['head', 'ns-htmlinit', 0],
                ['app', 'ns-htmlinit', 0],

                ['content1-inner', 'ns-show', 0],
                ['content1', 'ns-show', 0],
                ['head', 'ns-show', 0],
                ['app', 'ns-show', 0],

                ['content1-inner', 'ns-repaint', 0],
                ['content1', 'ns-repaint', 0],
                ['head', 'ns-repaint', 0],
                ['app', 'ns-repaint', 0],

                ['content1-inner', 'ns-hide', 0],
                ['content1', 'ns-hide', 0],

                ['content2-inner', 'ns-htmlinit', 0],
                ['content2', 'ns-htmlinit', 0],
                ['content2-inner', 'ns-show', 0],
                ['content2', 'ns-show', 0],

                ['content2-inner', 'ns-repaint', 0],
                ['content2', 'ns-repaint', 0],
                ['head', 'ns-repaint', 1],
                ['app', 'ns-repaint', 1]
            ]);
        });
    });

    describe('redraw view', function() {

        beforeEach(function() {
            var layout = ns.layout.page('content1', {});
            new ns.Update(this.APP, layout, {}).start();

            /**
             * @type {ns.View}
             */
            var vContent1 = this.events['content1-ns-init-spy'].getCall(0).thisValue;
            vContent1.invalidate();

            layout = ns.layout.page('content1', {});
            new ns.Update(this.APP, layout, {}).start();
        });

        describe('events', function() {
            genTests([
                ['content1-inner', 'ns-hide', 'calledOnce'],
                ['content1', 'ns-hide', 'calledOnce'],

                ['content1-inner', 'ns-htmldestroy', 'calledOnce'],
                ['content1', 'ns-htmldestroy', 'calledOnce'],

                ['content1-inner', 'ns-htmlinit', 'calledTwice'],
                ['content1', 'ns-htmlinit', 'calledTwice'],

                ['content1-inner', 'ns-show', 'calledTwice'],
                ['content1', 'ns-show', 'calledTwice'],

                ['content1-inner', 'ns-repaint', 'calledTwice'],
                ['content1', 'ns-repaint', 'calledTwice']
            ]);
        });

        describe('order', function() {
            genOrderTests([
                ['content1-inner', 'ns-htmlinit', 0],
                ['content1', 'ns-htmlinit', 0],
                ['head', 'ns-htmlinit', 0],
                ['app', 'ns-htmlinit', 0],

                ['content1-inner', 'ns-show', 0],
                ['content1', 'ns-show', 0],
                ['head', 'ns-show', 0],
                ['app', 'ns-show', 0],

                ['content1-inner', 'ns-repaint', 0],
                ['content1', 'ns-repaint', 0],
                ['head', 'ns-repaint', 0],
                ['app', 'ns-repaint', 0],

                ['content1-inner', 'ns-hide', 0],
                ['content1', 'ns-hide', 0],

                ['content1-inner', 'ns-htmldestroy', 0],
                ['content1', 'ns-htmldestroy', 0],

                ['content1-inner', 'ns-htmlinit', 1],
                ['content1', 'ns-htmlinit', 1],
                ['content1-inner', 'ns-show', 1],
                ['content1', 'ns-show', 1],

                ['content1-inner', 'ns-repaint', 1],
                ['content1', 'ns-repaint', 1],
                ['head', 'ns-repaint', 1],
                ['app', 'ns-repaint', 1]
            ]);
        });
    });

    describe('ns-async', function() {

        beforeEach(function() {
            ns.layout.define('content1-async', {
                'app content@': {
                    'content1-async&': {
                        'content1-inner': true
                    }
                }
            }, 'app');

            ns.Model.define('content1-async-model');

            this.xhr = sinon.useFakeXMLHttpRequest();
            var requests = this.requests = [];
            this.xhr.onCreate = function (xhr) {
                requests.push(xhr);
            };

            var layout = ns.layout.page('content1-async', {});
            new ns.Update(this.APP, layout, {}).start();
        });

        afterEach(function() {
            this.xhr.restore();
            ns.request.clean();
        });

        describe('first pass', function() {
            describe('events', function() {
                genTests([
                    ['content1-async', 'ns-async', 'calledOnce'],

                    ['content1-async', 'ns-htmldestroy', 'called', false],
                    ['content1-async', 'ns-hide', 'called', false],
                    ['content1-async', 'ns-htmlinit', 'called', false],
                    ['content1-async', 'ns-show', 'called', false],
                    ['content1-async', 'ns-repaint', 'called', false],

                    ['content1-inner', 'ns-htmldestroy', 'called', false],
                    ['content1-inner', 'ns-hide', 'called', false],
                    ['content1-inner', 'ns-htmlinit', 'called', false],
                    ['content1-inner', 'ns-show', 'called', false],
                    ['content1-inner', 'ns-repaint', 'called', false]
                ])
            });

            describe('order', function() {
                genOrderTests([
                    ['head', 'ns-htmlinit', 0],
                    ['app', 'ns-htmlinit', 0],

                    ['content1-async', 'ns-async', 0],

                    ['head', 'ns-show', 0],
                    ['app', 'ns-show', 0],

                    ['head', 'ns-repaint', 0],
                    ['app', 'ns-repaint', 0]
                ]);
            });
        });

        describe('second pass', function() {

            beforeEach(function() {
                this.requests[0].respond(
                    200,
                    {"Content-Type": "application/json"},
                    JSON.stringify({
                        models: [
                            {data: true}
                        ]
                    })
                );
            });

            describe('events', function() {
                genTests([
                    ['content1-async', 'ns-async', 'calledOnce'],

                    ['content1-async', 'ns-htmlinit', 'calledOnce'],
                    ['content1-async', 'ns-show', 'calledOnce'],
                    ['content1-async', 'ns-repaint', 'calledOnce'],

                    ['content1-inner', 'ns-htmlinit', 'calledOnce'],
                    ['content1-inner', 'ns-show', 'calledOnce'],
                    ['content1-inner', 'ns-repaint', 'calledOnce'],

                    ['head', 'ns-repaint', 'calledOnce'],
                    ['app', 'ns-repaint', 'calledOnce'],

                    ['content1-async', 'ns-htmldestroy', 'called', false],
                    ['content1-inner', 'ns-htmldestroy', 'called', false]
                ])
            });

            describe('order', function() {
                genOrderTests([
                    ['head', 'ns-htmlinit', 0],
                    ['app', 'ns-htmlinit', 0],

                    ['content1-async', 'ns-async', 0],

                    ['head', 'ns-show', 0],
                    ['app', 'ns-show', 0],

                    ['head', 'ns-repaint', 0],
                    ['app', 'ns-repaint', 0],

                    ['content1-inner', 'ns-htmlinit', 0],
                    ['content1-async', 'ns-htmlinit', 0],

                    ['content1-inner', 'ns-show', 0],
                    ['content1-async', 'ns-show', 0],

                    ['content1-inner', 'ns-repaint', 0],
                    ['content1-async', 'ns-repaint', 0]
                ]);
            })
        });

    });
});
