describe('no.request.js', function() {

    describe('no.request()', function() {

        beforeEach(function() {
            this._requestModels = no.request.models;
            no.request.models = sinon.spy();

            no.Model.define('test-model');
            no.Model.define('test-model2');
            no.Model.define('test-model-with-params', {
                params: {
                    id: false
                }
            });
        });

        afterEach(function() {
            no.request.models = this._requestModels
        });

        describe('no.request("modelName")', function() {

            it('should call no.request.models once', function() {
                no.request('test-model');

                expect(no.request.models.calledOnce).to.be.ok();
            });

            it('should call no.request.models with requested model', function() {
                no.request('test-model');

                var model = no.Model.get('test-model');
                expect(no.request.models.calledWithExactly([model])).to.be.ok();
            });
        });

        describe('no.request("modelName", params)', function() {

            beforeEach(function() {
                no.request('test-model-with-params', {id: 1});
            });

            it('should call no.request.models once', function() {
                expect(no.request.models.calledOnce).to.be.ok();
            });

            it('should call no.request.models with requested model', function() {
                var model = no.Model.get('test-model-with-params', {id: 1});
                expect(no.request.models.calledWithExactly([model])).to.be.ok();
            });
        });

        describe('no.request( ["modelName1", "modelName2"] )', function() {

            beforeEach(function() {
                no.request(['test-model', 'test-model-with-params']);
            });

            it('should call no.request.models once', function() {
                expect(no.request.models.calledOnce).to.be.ok();
            });

            it('should call no.request.models with requested models', function() {
                var model1 = no.Model.get('test-model');
                var model2 = no.Model.get('test-model-with-params', {});

                expect(no.request.models.calledWithExactly([model1, model2])).to.be.ok();
            });
        });

        describe('no.request( ["modelName1", "modelName2"], params )', function() {

            beforeEach(function() {
                no.request(['test-model', 'test-model-with-params'], {id: 1});
            });

            it('should call no.request.models once', function() {
                expect(no.request.models.calledOnce).to.be.ok();
            });

            it('should call no.request.models with requested models', function() {
                var model1 = no.Model.get('test-model');
                var model2 = no.Model.get('test-model-with-params', {id: 1});

                expect(no.request.models.calledWithExactly([model1, model2])).to.be.ok();
            });
        });

        describe('no.request( [{id: "modelName1"}] )', function() {

            beforeEach(function() {
                no.request([
                    {
                        id: 'test-model'
                    },
                    {
                        id: 'test-model-with-params',
                        params: {
                            id: 2
                        }
                    }
                ]);
            });

            it('should call no.request.models once', function() {
                expect(no.request.models.calledOnce).to.be.ok();
            });

            it('should call no.request.models with requested models', function() {
                var model1 = no.Model.get('test-model');
                var model2 = no.Model.get('test-model-with-params', {id: 2});

                expect(no.request.models.calledWithExactly([model1, model2])).to.be.ok();
            });
        });

    });

});
