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

        var views = ['app', 'head', 'content1', 'content1-inner', 'content2', 'content2-inner'];
        var events = ['init', 'htmlinit', 'show', 'repaint', 'hide', 'htmldestroy'];

        this.events = {};

        for (var i = 0, j = views.length; i < j; i++) {
            var view = views[i];
            var eventsDecl = {};
            for (var k = 0, l = events.length; k < l; k++) {
                var event = events[k];
                var spy = sinon.spy();

                eventsDecl[event + ' .'] = spy;
                this.events[view + '-' + event + '-spy'] = spy
            }

            no.View.define(view, {
                events: eventsDecl
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
                ['content2', 'init', 'calledOnce', false],
                ['content2-inner', 'init', 'calledOnce', false]
            ]);
        });

        describe('htmlinit', function() {
            genTests([
                ['app', 'htmlinit', 'calledOnce'],
                ['head', 'htmlinit', 'calledOnce'],
                ['content1', 'htmlinit', 'calledOnce'],
                ['content1-inner', 'htmlinit', 'calledOnce'],
                ['content2', 'htmlinit', 'calledOnce', false],
                ['content2-inner', 'htmlinit', 'calledOnce', false]
            ]);
        });

        describe('show', function() {
            genTests([
                ['app', 'show', 'calledOnce'],
                ['head', 'show', 'calledOnce'],
                ['content1', 'show', 'calledOnce'],
                ['content1-inner', 'show', 'calledOnce'],
                ['content2', 'show', 'calledOnce', false],
                ['content2-inner', 'show', 'calledOnce', false]
            ]);
        });

        describe('repaint', function() {
            genTests([
                ['app', 'repaint', 'calledOnce'],
                ['head', 'repaint', 'calledOnce'],
                ['content1', 'repaint', 'calledOnce'],
                ['content1-inner', 'repaint', 'calledOnce'],
                ['content2', 'repaint', 'calledOnce', false],
                ['content2-inner', 'repaint', 'calledOnce', false]
            ]);
        });

        describe('hide', function() {
            genTests([
                ['app', 'hide', 'calledOnce', false],
                ['head', 'hide', 'calledOnce', false],
                ['content1', 'hide', 'calledOnce', false],
                ['content1-inner', 'hide', 'calledOnce', false],
                ['content2', 'hide', 'calledOnce', false],
                ['content2-inner', 'hide', 'calledOnce', false]
            ]);
        });

        describe('htmldestroy', function() {
            genTests([
                ['app', 'htmldestroy', 'calledOnce', false],
                ['head', 'htmldestroy', 'calledOnce', false],
                ['content1', 'htmldestroy', 'calledOnce', false],
                ['content1-inner', 'htmldestroy', 'calledOnce', false],
                ['content2', 'htmldestroy', 'calledOnce', false],
                ['content2-inner', 'htmldestroy', 'calledOnce', false]
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

    //TODO: порядок вызова событий
    //TODO: вызывается для всех дочерних блоков
    //TODO: view update test
    //TODO: async-view test
});
