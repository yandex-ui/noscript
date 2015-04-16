describe('ns.Update.perf', function() {

    beforeEach(function() {
        this.sinon.stub(ns.Update.prototype, 'perf');
    });

    describe('requestModels ->', function() {

        it('должен быть 0, если не было запроса', function() {
            ns.View.define('app');

            return ns.View.create('app').update().then(function() {
                var log = ns.Update.prototype.perf.getCall(0).args[0];

                expect(log.requestModels).to.be.equal(0);
            });
        });

        it('должен быть > 0, если был запроса', function() {
            this.sinon.server.autoRespond = true;
            this.sinon.server.respond(function(xhr) {
                xhr.respond(
                    200,
                    {"Content-Type": "application/json"},
                    JSON.stringify({
                        models: [
                            { data: true }
                        ]
                    })
                );
            });

            ns.Model.define('model');
            ns.View.define('app', {
                models: ['model']
            });

            return ns.View.create('app').update().then(function() {
                var log = ns.Update.prototype.perf.getCall(0).args[0];
                expect(log.requestModels).to.be.above(0);
            });
        });

    });

});
