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

    describe('no.reques.models()', function(){
        // sinon.useFakeXMLHttpRequest() гадит в window
        mocha.setup({ignoreLeaks: true});

        beforeEach(function() {
            no.Model.define('test-model');

            this.xhr = sinon.useFakeXMLHttpRequest();
            var requests = this.requests = [];

            this.xhr.onCreate = function (xhr) {
                console.log('create request', xhr);
                requests.push(xhr);
            };
        });

        afterEach(function() {
            this.xhr.restore();
        });

        it('should create http request for model without cache', function() {
            var promise = no.request('test-model');
            expect(this.requests.length).to.be(1);

            /*
            this.requests[0].respond(200, { "Content-Type": "application/json" },
                                     '[{ "id": 12, "comment": "Hey there" }]');
             */
        });

        it('should not create http request for model with cache', function() {
            var model = no.Model.create('test-model');
            model.setData(true);

            no.request('test-model');
            expect(this.requests.length).to.be(0);
        });

        it('should call promise immediatly for model with cache', function() {
            var model = no.Model.create('test-model');
            model.setData(true);

            var result = false;
            no.request('test-model').then(function() {
                result = true;
            });

            expect(result).to.be.ok();
        });

        mocha.setup({ignoreLeaks: false});
    });

});
