describe.only('local update', function() {

    beforeEach(function(done) {

        this.touchSpy = this.sinon.spy();
        this.htmlinitSpy = this.sinon.spy();
        this.showSpy = this.sinon.spy();
        this.asyncSpy = this.sinon.spy();

        this.sinon.spy(ns, 'Update');
        this.sinon.spy(ns, 'replaceNode');

        this.fakeXhr = sinon.useFakeXMLHttpRequest();
        var requests = this.requests = [];

        this.fakeXhr.onCreate = function (xhr) {
            console.log('onCreate', xhr);
            requests.push(xhr);

            window.setTimeout(function() {
                console.info('response', xhr);
                xhr.respond(
                    200,
                    {"Content-Type": "application/json"},
                    JSON.stringify({
                        models: [
                            { data: true }
                        ]
                    })
                );
            }, 100 * requests.length);
        };

        var layout = {};
        for (var i = 0; i < 6; i++) {
            genView.call(this, i);
            layout['view-' + i + '&'] = {};
        }

        ns.layout.define('test', {
            'app': layout
        });

        ns.View.define('app', {
            events: {
                'ns-view-touch': this.touchSpy,
                'ns-view-htmlinit': this.htmlinitSpy,
                'ns-view-show': this.showSpy
            }
        });

        this.view = ns.View.create('app');

        new ns.Update(this.view, ns.layout.page('test'), {}).render()
            .then(function(res) {
                console.log('sync state fulfill', res);
                console.log('ns.Update calls', ns.Update.callCount);
                console.log('this.touchSpy', this.touchSpy.callCount);
                console.log('this.htmlinitSpy', this.htmlinitSpy.callCount);
                console.log('this.showSpy', this.showSpy.callCount);
                console.log('this.asyncSpy', this.asyncSpy.callCount);

                console.log('ns.replaceNode', ns.replaceNode.callCount);

                Vow.all(res.async).then(function(res) {
                    console.log('===========');
                    console.log('async state fulfill', res);

                    console.log('ns.Update calls', ns.Update.callCount);
                    console.log('this.touchSpy', this.touchSpy.callCount);
                    console.log('this.htmlinitSpy', this.htmlinitSpy.callCount);
                    console.log('this.showSpy', this.showSpy.callCount);
                    console.log('this.asyncSpy', this.asyncSpy.callCount);

                    console.log('ns.replaceNode', ns.replaceNode.callCount);

                    done();

                }, function(err) {
                    console.log('async state reject', err);
                }, this);
            }, null, this);
    });

    it('1', function() {

    });

    function genView(i) {
        ns.View.define('view-' + i, {
            events: {
                'ns-view-async': this.asyncSpy,
                'ns-view-touch': this.touchSpy,
                'ns-view-htmlinit': this.htmlinitSpy,
                'ns-view-show': this.showSpy
            },
            models: ['model-' + i]
        });

        ns.Model.define('model-' + i);
    }

});
