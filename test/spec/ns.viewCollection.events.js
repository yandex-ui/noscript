describe('ns.ViewСollection ns-view-* events', function() {

    function genTests(defs) {
        for (var i = 0, j = defs.length; i < j; i++) {
            var def = defs[i];
            (function(view, event, check, not) {
                it('should ' + (not == false ? 'not ': '') + ' trigger "' + event + '" for "' + view + '" (' + check + ')', function() {
                    var spyName = view + '-' + event + '-spy';
                    if (not === false) {
                        expect(this.events[spyName][check]).to.be.equal(false);
                    } else if (typeof not === 'number') {
                        expect(this.events[spyName]).to.have.callCount(not);
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

        ns.Model.get('model-collection').setData({
            item: [
                {id: 1, data: 'item1'},
                {id: 2, data: 'item2'},
                {id: 3, data: 'item3'}
            ]
        });

        this.events = {};
        this.events['content-collection-item-ns-view-async-spy'] = this.sinon.spy();
        this.events['content-collection-item-ns-view-init-spy'] = this.sinon.spy();
        this.events['content-collection-item-ns-view-htmlinit-spy'] = this.sinon.spy();
        this.events['content-collection-item-ns-view-show-spy'] = this.sinon.spy();
        this.events['content-collection-item-ns-view-touch-spy'] = this.sinon.spy();
        this.events['content-collection-item-ns-view-hide-spy'] = this.sinon.spy();
        this.events['content-collection-item-ns-view-htmldestroy-spy'] = this.sinon.spy();

        ns.View.define('content-collection-item', {
            events: {
                'ns-view-async': this.events['content-collection-item-ns-view-async-spy'],
                'ns-view-init': this.events['content-collection-item-ns-view-init-spy'],
                'ns-view-htmlinit': this.events['content-collection-item-ns-view-htmlinit-spy'],
                'ns-view-show': this.events['content-collection-item-ns-view-show-spy'],
                'ns-view-touch': this.events['content-collection-item-ns-view-touch-spy'],
                'ns-view-hide': this.events['content-collection-item-ns-view-hide-spy'],
                'ns-view-htmldestroy': this.events['content-collection-item-ns-view-htmldestroy-spy']
            },
            models: [ 'model-collection-item' ]
        });

        var views = ['app', 'head', 'content-collection@model-collection', 'content2'];
        var events = ['ns-view-async', 'ns-view-init', 'ns-view-htmlinit', 'ns-view-show', 'ns-view-touch', 'ns-view-hide', 'ns-view-htmldestroy'];

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

            if (/-collection$/.test(view)) {
                ns.ViewCollection.define(view, {
                    events: eventsDecl,
                    models: model ? [model] : [],
                    split: {
                        byModel: model,
                        intoViews: view + '-item'
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
            ['content-collection', 'ns-view-touch', 'called', false],
            ['content-collection', 'ns-view-hide', 'called', false],
            ['content-collection', 'ns-view-htmldestroy', 'called', false]
        ]);

    });

    describe('first rendering', function() {

        beforeEach(function(finish) {
            var layout = ns.layout.page('content1', {});
            var update = new ns.Update(this.APP, layout, {});
            update.start().then(function() {
                finish();
            });
        });

        genTests([
            ['content-collection', 'ns-view-async', 'called', false],
            ['content-collection', 'ns-view-init', 'calledOnce'],
            ['content-collection', 'ns-view-htmlinit', 'calledOnce'],
            ['content-collection', 'ns-view-show', 'calledOnce'],
            ['content-collection', 'ns-view-touch', 'calledOnce'],
            ['content-collection', 'ns-view-hide', 'called', false],
            ['content-collection', 'ns-view-htmldestroy', 'called', false],

            ['content-collection-item', 'ns-view-async', 'called', false],
            ['content-collection-item', 'ns-view-init', 'calledThrice'],
            ['content-collection-item', 'ns-view-htmlinit', 'calledThrice'],
            ['content-collection-item', 'ns-view-show', 'calledThrice'],
            ['content-collection-item', 'ns-view-touch', 'calledThrice'],
            ['content-collection-item', 'ns-view-hide', 'called', false],
            ['content-collection-item', 'ns-view-htmldestroy', 'called', false]
        ]);

    });

    describe('change to another layout', function() {

        beforeEach(function(finish) {
            var layout = ns.layout.page('content1', {});
            var update = new ns.Update(this.APP, layout, {});
            update.start().then(function() {
                layout = ns.layout.page('content2', {});
                new ns.Update(this.APP, layout, {}).start().then(function() {
                    finish();
                });
            }.bind(this));

        });

        genTests([
            ['content-collection', 'ns-view-async', 'called', false],
            ['content-collection', 'ns-view-init', 'calledOnce'],
            ['content-collection', 'ns-view-htmlinit', 'calledOnce'],
            ['content-collection', 'ns-view-show', 'calledOnce'],
            ['content-collection', 'ns-view-touch', 'calledOnce'],
            ['content-collection', 'ns-view-hide', 'calledOnce'],
            ['content-collection', 'ns-view-htmldestroy', 'called', false],

            ['content-collection-item', 'ns-view-async', 'called', false],
            ['content-collection-item', 'ns-view-init', '', 3],
            ['content-collection-item', 'ns-view-htmlinit', '', 3],
            ['content-collection-item', 'ns-view-show', '', 3],
            ['content-collection-item', 'ns-view-touch', '', 3],
            ['content-collection-item', 'ns-view-hide', '', 3],
            ['content-collection-item', 'ns-view-htmldestroy', 'called', false]
        ]);

    });

});
