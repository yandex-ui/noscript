describe('no.request.js', function() {

    describe('no.request()', function() {

        beforeEach(function() {
            this._requestModels = no.request.models;
            no.request.models = sinon.spy();
            no.Model.define('test-model')
        });

        afterEach(function() {
            no.request.models = this._requestModels
        });

        describe('model name as string', function() {
            it('should call no.request.models', function() {
                no.request('test-model');

                expect(no.request.models.calledOnce).to.be.ok();
            });

            it('should call no.request.models with requested model', function() {
                no.request('test-model');
                var model = no.Model.get('test-model');

                expect(no.request.models.calledWith([model])).to.be.ok();
            });
        });

    });

});
