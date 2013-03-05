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

    beforeEach(function() {
        no.layout.define('app', {
            'app': {
                'head': true,
                'content@': true
            }
        });

        no.layout.define('content1', {
            'app content@': {
                'content1': true
            }
        }, 'app');

        no.layout.define('content2', {
            'app content@': {
                'content2': true
            }
        }, 'app');

        var views = ['app', 'head', 'content1', 'content2'];
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
                ['content2', 'init', 'calledOnce', false]
            ]);
        });

        describe('htmlinit', function() {
            genTests([
                ['app', 'htmlinit', 'calledOnce'],
                ['head', 'htmlinit', 'calledOnce'],
                ['content1', 'htmlinit', 'calledOnce'],
                ['content2', 'htmlinit', 'calledOnce', false]
            ]);
        });

        describe('show', function() {
            genTests([
                ['app', 'show', 'calledOnce'],
                ['head', 'show', 'calledOnce'],
                ['content1', 'show', 'calledOnce'],
                ['content2', 'show', 'calledOnce', false]
            ]);
        });

        describe('repaint', function() {
            genTests([
                ['app', 'repaint', 'calledOnce'],
                ['head', 'repaint', 'calledOnce'],
                ['content1', 'repaint', 'calledOnce'],
                ['content2', 'repaint', 'calledOnce', false]
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
            ['content2', 'init', 'calledOnce'],
            ['content2', 'htmlinit', 'calledOnce'],
            ['content2', 'show', 'calledOnce'],
            ['content2', 'repaint', 'calledOnce'],

            ['app', 'show', 'calledOnce'],
            ['content1', 'hide', 'calledOnce'],

            ['app', 'repaint', 'calledTwice'],
            ['head', 'repaint', 'calledTwice'],
            ['content1', 'repaint', 'calledOnce']
        ]);
    });

    //TODO: порядок вызова событий
});
