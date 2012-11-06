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
                requests.push(xhr);
            };
        });

        afterEach(function() {
            this.xhr.restore();
        });

        describe('STATUS_NONE', function() {

            beforeEach(function() {
                no.Model.define('test-model-none');

                this.model = no.Model.create('test-model-none');
                this.promise = no.request('test-model-none');
            });

            afterEach(function() {
                this.model.invalidate();
            });

            it('should create http request for model', function() {
                expect(this.requests.length).to.be(1);
            });

            it('should not resolve promise immediatly', function() {
                var result = false;
                this.promise.then(function() {
                    result = true;
                });

                expect(result).to.not.be.ok();
            });

            it('should increment retries', function() {
                expect(this.model.retries).to.be(1);
            });

            it('should set statis to STATUS_LOADING', function() {
                expect(this.model.status).to.be(this.model.STATUS_LOADING);
            });

            it('should resolve promise after response', function() {
                var result = false;
                this.promise.then(function() {
                    result = true;
                });

                this.requests[0].respond(
                    200,
                    {"Content-Type": "application/json"},
                    JSON.stringify([
                        {result: true}
                    ])
                );

                expect(result).to.be.ok();
            })
        });

        describe('STATUS_OK', function() {

            beforeEach(function() {
                var model = no.Model.create('test-model');
                model.setData(true);
            });

            it('should not create http request for model', function() {
                no.request('test-model');
                expect(this.requests.length).to.be(0);
            });

            it('should resolve promise immediatly for model', function() {
                var result = false;
                no.request('test-model').then(function() {
                    result = true;
                });

                expect(result).to.be.ok();
            });
        });

        describe('STATUS_ERROR', function() {

            beforeEach(function() {
                var model = no.Model.create('test-model');
                model.status = model.STATUS_ERROR;
            });

            it('should not create http request for model', function() {
                no.request('test-model');
                expect(this.requests.length).to.be(0);
            });

            it('should resolve promise immediatly for model', function() {
                var result = false;
                no.request('test-model').then(function() {
                    result = true;
                });

                expect(result).to.be.ok();
            });
        });

        describe('STATUS_LOADING', function() {

            beforeEach(function() {
                var model = no.Model.create('test-model');
                model.status = model.STATUS_LOADING;
                model.promise = new no.Promise();
            });

            it('should not create http request for model', function() {
                no.request('test-model');
                expect(this.requests.length).to.be(0);
            });

            it('should not resolve promise immediatly for model', function() {
                var result = false;
                no.request('test-model').then(function() {
                    result = true;
                });

                expect(result).to.not.be.ok();
            });
        });

        describe('STATUS_FAILED', function() {

            beforeEach(function() {
                no.Model.define('test-model-failed');

                this.model = no.Model.create('test-model-failed');
                this.model.status = this.model.STATUS_FAILED;
            });

            afterEach(function() {
                this.model.invalidate();
            });

            describe('common', function() {

                beforeEach(function() {
                    this.model.canRetry = sinon.spy(function() {
                        return false;
                    });

                    this.promise = no.request.models([this.model]);
                });

                it('should call model.canRetry', function() {
                    expect(this.model.canRetry.calledOnce).to.be.ok();
                });

                it('should call model.canRetry with no args', function() {
                    expect(this.model.canRetry.calledWithExactly()).to.be.ok();
                });
            });

            describe('cant retry', function() {

                beforeEach(function() {
                    this.model.canRetry = function() {
                        return false;
                    };
                    this.promise = no.request.models([this.model]);
                });

                it('should not create http request', function() {
                    expect(this.requests.length).to.be(0);
                });

                it('should set status to STATUS_ERROR', function() {
                    expect(this.model.status).to.be(this.model.STATUS_ERROR);
                });

                it('should resolve promise immediatly', function() {
                    var result = false;
                    this.promise.then(function() {
                        result = true;
                    });

                    expect(result).to.be.ok();
                });
            });

            describe('can retry', function() {

                beforeEach(function() {
                    this.model.canRetry = function() {
                        return true;
                    };
                    this.promise = no.request.models([this.model]);
                });

                it('should create http request', function() {
                    expect(this.requests.length).to.be(1);
                });

                it('should set status to STATUS_LOADING', function() {
                    expect(this.model.status).to.be(this.model.STATUS_LOADING);
                });

                it('should not resolve promise immediatly', function() {
                    var result = false;
                    this.promise.then(function() {
                        result = true;
                    });

                    expect(result).to.not.be.ok();
                });
            });

        });

        mocha.setup({ignoreLeaks: false});
    });

    describe('addRequestParams', function() {

        beforeEach(function() {
            sinon.stub(no, 'http', function() {
                return new no.Promise();
            });

            no.Model.define('test-model-addRequestParams');

            this.originalParams = {
                a: 1,
                b: 2
            };
            no.request.requestParams = no.extend({}, this.originalParams);
            sinon.spy(no.request, 'addRequestParams');

            no.request('test-model-addRequestParams');
        });

        afterEach(function() {
            no.request.addRequestParams.restore();
            no.http.restore();
        });

        it('request should call no.request.addRequestParams', function() {
            expect(no.request.addRequestParams.calledOnce).to.be.ok();
        });

        it('request should add no.request.requestParams to xhr.params', function() {
            for (var prop in no.request.requestParams) {
                expect(no.http.getCall(0).args[1]).to.have.property(prop, no.request.requestParams[prop]);
            }
        });

        it('request should not modify no.request.requestParams', function() {
            expect(no.request.requestParams).to.eql(this.originalParams);
        });

    });


    //TODO: STATUS_INVALID
    //TODO: xhr response parsing
});
