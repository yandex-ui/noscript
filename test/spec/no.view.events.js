describe('no.View.events', function() {

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
        no.layout.define('app', {
            'app': {
                'head': true,
                'content@': true
            }
        });

        no.layout.define('content1', {
            'app content@': {
                'content1': {
                    'content1-inner': true
                }
            }
        }, 'app');

        no.layout.define('content2', {
            'app content@': {
                'content2': {
                    'content2-inner': true
                }
            }
        }, 'app');

        var views = ['app', 'head', 'content1', 'content1-async@content1-async-model', 'content1-inner', 'content2', 'content2-inner'];
        var events = ['async', 'init', 'htmlinit', 'show', 'repaint', 'hide', 'htmldestroy'];

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

            no.View.define(view, {
                events: eventsDecl,
                models: model ? [model] : []
            });
        }

        /**
         *
         * @type {no.View}
         */
        this.APP = no.View.create('app');

        function genHTML(views) {
            var html = '';
            for (var id in views) {
                html += '<div class="ns-view-' + id + '">';
                html += genHTML(views[id].views);
                html += '</div>';
            }
            return html;
        }

        this.origNotmpl = no.tmpl;

        no.tmpl = function(json) {
            return '<div class="root">' + genHTML(json.views) + '</div>';
        };
    });

    afterEach(function() {
        no.layout.undefine();
        no.View.undefine();
        no.Model.undefine();

        no.tmpl = this.origNotmpl;

        delete this.events;
        delete this.APP;
        delete this.origNotmpl
    });

    describe('first rendering', function() {

        beforeEach(function() {
            var layout = no.layout.page('content1', {});
            var update = new no.Update(this.APP, layout, {});
            update.start();
        });

        describe('init', function() {
            genTests([
                ['app', 'init', 'calledOnce'],
                ['head', 'init', 'calledOnce'],
                ['content1', 'init', 'calledOnce'],
                ['content1-inner', 'init', 'calledOnce'],
                ['content2', 'init', 'called', false],
                ['content2-inner', 'init', 'called', false]
            ]);
        });

        describe('htmlinit', function() {
            genTests([
                ['app', 'htmlinit', 'calledOnce'],
                ['head', 'htmlinit', 'calledOnce'],
                ['content1', 'htmlinit', 'calledOnce'],
                ['content1-inner', 'htmlinit', 'calledOnce'],
                ['content2', 'htmlinit', 'called', false],
                ['content2-inner', 'htmlinit', 'called', false]
            ]);
        });

        describe('show', function() {
            genTests([
                ['app', 'show', 'calledOnce'],
                ['head', 'show', 'calledOnce'],
                ['content1', 'show', 'calledOnce'],
                ['content1-inner', 'show', 'calledOnce'],
                ['content2', 'show', 'called', false],
                ['content2-inner', 'show', 'called', false]
            ]);
        });

        describe('repaint', function() {
            genTests([
                ['app', 'repaint', 'calledOnce'],
                ['head', 'repaint', 'calledOnce'],
                ['content1', 'repaint', 'calledOnce'],
                ['content1-inner', 'repaint', 'calledOnce'],
                ['content2', 'repaint', 'called', false],
                ['content2-inner', 'repaint', 'called', false]
            ]);
        });

        describe('hide', function() {
            genTests([
                ['app', 'hide', 'called', false],
                ['head', 'hide', 'called', false],
                ['content1', 'hide', 'called', false],
                ['content1-inner', 'hide', 'called', false],
                ['content2', 'hide', 'called', false],
                ['content2-inner', 'hide', 'called', false]
            ]);
        });

        describe('htmldestroy', function() {
            genTests([
                ['app', 'htmldestroy', 'called', false],
                ['head', 'htmldestroy', 'called', false],
                ['content1', 'htmldestroy', 'called', false],
                ['content1-inner', 'htmldestroy', 'called', false],
                ['content2', 'htmldestroy', 'called', false],
                ['content2-inner', 'htmldestroy', 'called', false]
            ]);
        });

        describe('order', function() {
            genOrderTests([
                ['content1-inner', 'htmlinit'],
                ['content1', 'htmlinit'],
                ['head', 'htmlinit'],
                ['app', 'htmlinit'],

                ['content1-inner', 'show'],
                ['content1', 'show'],
                ['head', 'show'],
                ['app', 'show'],

                ['content1-inner', 'repaint'],
                ['content1', 'repaint'],
                ['head', 'repaint'],
                ['app', 'repaint']
            ]);
        });

    });

    describe('change view in box', function() {

        beforeEach(function() {
            var layout = no.layout.page('content1', {});
            new no.Update(this.APP, layout, {}).start();

            layout = no.layout.page('content2', {});
            new no.Update(this.APP, layout, {}).start();
        });

        genTests([

            ['content2-inner', 'init', 'calledOnce'],
            ['content2-inner', 'htmlinit', 'calledOnce'],
            ['content2-inner', 'show', 'calledOnce'],
            ['content2-inner', 'repaint', 'calledOnce'],

            ['content2', 'init', 'calledOnce'],
            ['content2', 'htmlinit', 'calledOnce'],
            ['content2', 'show', 'calledOnce'],
            ['content2', 'repaint', 'calledOnce'],

            ['app', 'show', 'calledOnce'],
            ['content1-inner', 'hide', 'calledOnce'],
            ['content1', 'hide', 'calledOnce'],

            ['app', 'repaint', 'calledTwice'],
            ['head', 'repaint', 'calledTwice'],
            ['content1', 'repaint', 'calledOnce'],
            ['content1-inner', 'repaint', 'calledOnce'],
            ['content2', 'repaint', 'calledOnce'],
            ['content2-inner', 'repaint', 'calledOnce']
        ]);

        describe('order', function() {
            genOrderTests([
                ['content1-inner', 'htmlinit', 0],
                ['content1', 'htmlinit', 0],
                ['head', 'htmlinit', 0],
                ['app', 'htmlinit', 0],

                ['content1-inner', 'show', 0],
                ['content1', 'show', 0],
                ['head', 'show', 0],
                ['app', 'show', 0],

                ['content1-inner', 'repaint', 0],
                ['content1', 'repaint', 0],
                ['head', 'repaint', 0],
                ['app', 'repaint', 0],

                ['content1-inner', 'hide', 0],
                ['content1', 'hide', 0],

                ['content2-inner', 'htmlinit', 0],
                ['content2', 'htmlinit', 0],
                ['content2-inner', 'show', 0],
                ['content2', 'show', 0],

                ['content2-inner', 'repaint', 0],
                ['content2', 'repaint', 0],
                ['head', 'repaint', 1],
                ['app', 'repaint', 1]
            ]);
        });
    });

    describe('redraw view', function() {

        beforeEach(function() {
            var layout = no.layout.page('content1', {});
            new no.Update(this.APP, layout, {}).start();

            /**
             * @type {no.View}
             */
            var vContent1 = this.events['content1-init-spy'].getCall(0).thisValue;
            vContent1.invalidate();

            layout = no.layout.page('content1', {});
            new no.Update(this.APP, layout, {}).start();
        });

        describe('events', function() {
            genTests([
                ['content1-inner', 'hide', 'calledOnce'],
                ['content1', 'hide', 'calledOnce'],

                ['content1-inner', 'htmldestroy', 'calledOnce'],
                ['content1', 'htmldestroy', 'calledOnce'],

                ['content1-inner', 'htmlinit', 'calledTwice'],
                ['content1', 'htmlinit', 'calledTwice'],

                ['content1-inner', 'show', 'calledTwice'],
                ['content1', 'show', 'calledTwice'],

                ['content1-inner', 'repaint', 'calledTwice'],
                ['content1', 'repaint', 'calledTwice']
            ]);
        });

        describe('order', function() {
            genOrderTests([
                ['content1-inner', 'htmlinit', 0],
                ['content1', 'htmlinit', 0],
                ['head', 'htmlinit', 0],
                ['app', 'htmlinit', 0],

                ['content1-inner', 'show', 0],
                ['content1', 'show', 0],
                ['head', 'show', 0],
                ['app', 'show', 0],

                ['content1-inner', 'repaint', 0],
                ['content1', 'repaint', 0],
                ['head', 'repaint', 0],
                ['app', 'repaint', 0],

                ['content1-inner', 'hide', 0],
                ['content1', 'hide', 0],

                ['content1-inner', 'htmldestroy', 0],
                ['content1', 'htmldestroy', 0],

                ['content1-inner', 'htmlinit', 1],
                ['content1', 'htmlinit', 1],
                ['content1-inner', 'show', 1],
                ['content1', 'show', 1],

                ['content1-inner', 'repaint', 1],
                ['content1', 'repaint', 1],
                ['head', 'repaint', 1],
                ['app', 'repaint', 1]
            ]);
        });
    });

    describe('async', function() {

        beforeEach(function() {
            no.layout.define('content1-async', {
                'app content@': {
                    'content1-async&': {
                        'content1-inner': true
                    }
                }
            }, 'app');

            no.Model.define('content1-async-model');

            this.xhr = sinon.useFakeXMLHttpRequest();
            var requests = this.requests = [];
            this.xhr.onCreate = function (xhr) {
                requests.push(xhr);
            };

            var layout = no.layout.page('content1-async', {});
            new no.Update(this.APP, layout, {}).start();
        });

        afterEach(function() {
            this.xhr.restore();
            no.request.clean();
        });

        describe('first pass', function() {
            describe('events', function() {
                genTests([
                    ['content1-async', 'async', 'calledOnce'],

                    ['content1-async', 'htmldestroy', 'called', false],
                    ['content1-async', 'hide', 'called', false],
                    ['content1-async', 'htmlinit', 'called', false],
                    ['content1-async', 'show', 'called', false],
                    ['content1-async', 'repaint', 'called', false],

                    ['content1-inner', 'htmldestroy', 'called', false],
                    ['content1-inner', 'hide', 'called', false],
                    ['content1-inner', 'htmlinit', 'called', false],
                    ['content1-inner', 'show', 'called', false],
                    ['content1-inner', 'repaint', 'called', false]
                ])
            });

            describe('order', function() {
                genOrderTests([
                    ['head', 'htmlinit', 0],
                    ['app', 'htmlinit', 0],

                    ['content1-async', 'async', 0],

                    ['head', 'show', 0],
                    ['app', 'show', 0],

                    ['head', 'repaint', 0],
                    ['app', 'repaint', 0]
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
                    ['content1-async', 'async', 'calledOnce'],

                    ['content1-async', 'htmlinit', 'calledOnce'],
                    ['content1-async', 'show', 'calledOnce'],
                    ['content1-async', 'repaint', 'calledOnce'],

                    ['content1-inner', 'htmlinit', 'calledOnce'],
                    ['content1-inner', 'show', 'calledOnce'],
                    ['content1-inner', 'repaint', 'calledOnce'],

                    ['head', 'repaint', 'calledOnce'],
                    ['app', 'repaint', 'calledOnce'],

                    ['content1-async', 'htmldestroy', 'called', false],
                    ['content1-inner', 'htmldestroy', 'called', false]
                ])
            });

            describe('order', function() {
                genOrderTests([
                    ['head', 'htmlinit', 0],
                    ['app', 'htmlinit', 0],

                    ['content1-async', 'async', 0],

                    ['head', 'show', 0],
                    ['app', 'show', 0],

                    ['head', 'repaint', 0],
                    ['app', 'repaint', 0],

                    ['content1-inner', 'htmlinit', 0],
                    ['content1-async', 'htmlinit', 0],

                    ['content1-inner', 'show', 0],
                    ['content1-async', 'show', 0],

                    ['content1-inner', 'repaint', 0],
                    ['content1-async', 'repaint', 0]
                ]);
            })
        });

    });
});
