describe('ns.ViewСollection ns-view-* events', function() {

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
                'content@': true
            }
        });

        ns.layout.define('content1', {
            'app content@': {
                'content-collection': true
            }
        }, 'app');

        ns.layout.define('content2', {
            'app content@': {
                'content2': true
            }
        }, 'app');

        ns.layout.define('content3', {
            'app content@': {
                'content-collection&': true
            }
        }, 'app');

        ns.Model.define('model-collection-item', {
            params: {
                id: null
            }
        });

        ns.Model.define('model-collection', {
            split: {
                items: '.item',
                params: {
                    'id': '.id'
                },
                model_id: 'model-collection-item'
            }
        });

        ns.View.define('content-collection-item', {
            models: [ 'model-collection-item' ]
        });

        var views = ['app', 'head', 'content-collection@model-collection', 'content2'];
        var events = ['ns-view-async', 'ns-view-init', 'ns-view-htmlinit', 'ns-view-show', 'ns-view-repaint', 'ns-view-hide', 'ns-view-htmldestroy'];

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

            if (/-collection$/.test(view)) {
                ns.ViewCollection.define(view, {
                    events: eventsDecl,
                    models: model ? [model] : [],
                    split: {
                        view_id: view + '-item'
                    }
                });

            } else {
                ns.View.define(view, {
                    events: eventsDecl,
                    models: model ? [model] : []
                });
            }
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

    describe('first rendering without data', function() {

        beforeEach(function() {
            var layout = ns.layout.page('content1', {});
            var update = new ns.Update(this.APP, layout, {});
            update.start();
        });

        genTests([
            ['content-collection', 'ns-view-async', 'called', false],
            ['content-collection', 'ns-view-init', 'calledOnce'],
            ['content-collection', 'ns-view-htmlinit', 'called', false],
            ['content-collection', 'ns-view-show', 'called', false],
            ['content-collection', 'ns-view-repaint', 'called', false],
            ['content-collection', 'ns-view-hide', 'called', false],
            ['content-collection', 'ns-view-htmldestroy', 'called', false]
        ]);

    });

    describe('first rendering', function() {

        beforeEach(function() {
            var layout = ns.layout.page('content1', {});
            var update = new ns.Update(this.APP, layout, {});
            update.start();

            // finish first draw
            this.sinon.server.requests[0].respond(
                200,
                {"Content-Type": "application/json"},
                JSON.stringify({
                    models: [
                        {
                            data: {
                                item: [
                                    {id: 1, data: 'item1'},
                                    {id: 2, data: 'item2'},
                                    {id: 3, data: 'item3'}
                                ]
                            }
                        }
                    ]
                })
            );
        });

        genTests([
            ['content-collection', 'ns-view-async', 'called', false],
            ['content-collection', 'ns-view-init', 'calledOnce'],
            ['content-collection', 'ns-view-htmlinit', 'calledOnce'],
            ['content-collection', 'ns-view-show', 'calledOnce'],
            ['content-collection', 'ns-view-repaint', 'calledOnce'],
            ['content-collection', 'ns-view-hide', 'called', false],
            ['content-collection', 'ns-view-htmldestroy', 'called', false]
        ]);

    });

    describe('change to another layout', function() {

        beforeEach(function() {
            var layout = ns.layout.page('content1', {});
            var update = new ns.Update(this.APP, layout, {});
            update.start();

            // finish first draw
            this.sinon.server.requests[0].respond(
                200,
                {"Content-Type": "application/json"},
                JSON.stringify({
                    models: [
                        {
                            data: {
                                item: [
                                    {id: 1, data: 'item1'},
                                    {id: 2, data: 'item2'},
                                    {id: 3, data: 'item3'}
                                ]
                            }
                        }
                    ]
                })
            );

            layout = ns.layout.page('content2', {});
            new ns.Update(this.APP, layout, {}).start();
        });

        genTests([
            ['content-collection', 'ns-view-async', 'called', false],
            ['content-collection', 'ns-view-init', 'calledOnce'],
            ['content-collection', 'ns-view-htmlinit', 'calledOnce'],
            ['content-collection', 'ns-view-show', 'calledOnce'],
            ['content-collection', 'ns-view-repaint', 'calledOnce'],
            ['content-collection', 'ns-view-hide', 'calledOnce'],
            ['content-collection', 'ns-view-htmldestroy', 'called', false]
        ]);

    });

});
