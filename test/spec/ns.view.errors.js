describe('ns.View error handling', function() {
    describe('ns.Update.handleError', function() {

        beforeEach(function() {
            ns.Model.define('letter', { params: { id: null } });

            ns.View.define('app');
            ns.View.define('letter', { models: [ 'letter' ] });

            ns.layout.define('app', {
                'app': 'letter'
            });

            this.APP = ns.View.create('app');
            this.update = new ns.Update(
                this.APP,
                ns.layout.page('app', {}),
                {}
            );

            // Fake http server.
            this.server = sinon.fakeServer.create();
            this.server.autoRespond = true;
            this.server.respondWith(/.*/, function(xhr, id) {
                xhr.respond(
                    200,
                    { "Content-Type": "application/json" },
                    JSON.stringify({ models: [ { error: 'letter not found' } ] })
                );
            });
        });

        afterEach(function() {
            ns.clean();
            this.server.restore();
            delete this.APP;
            delete this.update;
        });

        it('render error view content', function(done) {
            var that = this;
            var update = this.update;
            ns.Update.handleError = function(_error, _update) {
                expect(_update).to.be(update);
                expect(_error.error).to.be('models');
                return true;
            };
            this.update.start().done(function() {
                expect($('.ns-view-letter', that.APP.node).html()).to.be('view-error-content');
                done();
            });
        });

        // TODO errors are passed in the render tree
    });
});
