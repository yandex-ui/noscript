describe('no.request.js', function() {

    describe('no.request()', function() {

        beforeEach(function() {
            this._requestModels = no.request.models;
            no.request.models = sinon.spy();

            ns.Model.define('test-model');
            ns.Model.define('test-model2');
            ns.Model.define('test-model-with-params', {
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

                var model = ns.Model.get('test-model');
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
                var model = ns.Model.get('test-model-with-params', {id: 1});
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
                var model1 = ns.Model.get('test-model');
                var model2 = ns.Model.get('test-model-with-params', {});

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
                var model1 = ns.Model.get('test-model');
                var model2 = ns.Model.get('test-model-with-params', {id: 1});

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
                var model1 = ns.Model.get('test-model');
                var model2 = ns.Model.get('test-model-with-params', {id: 2});

                expect(no.request.models.calledWithExactly([model1, model2])).to.be.ok();
            });
        });

    });

    describe('no.forcedRequest', function() {

        beforeEach(function() {
            ns.Model.define('test-forcedRequest');
            sinon.stub(no.request, 'models');
        });

        afterEach(function() {
            no.request.models.restore();
        });

        it('should call no.request.models with "forced" flag', function() {
            no.forcedRequest('test-forcedRequest');

            expect(no.request.models.getCall(0).args[1]).to.be(true);
        });
    });

    describe('no.reques.models()', function(){
        // sinon.useFakeXMLHttpRequest() гадит в window
        mocha.setup({ignoreLeaks: true});

        beforeEach(function() {
            ns.Model.define('test-model');

            this.xhr = sinon.useFakeXMLHttpRequest();
            var requests = this.requests = [];

            this.xhr.onCreate = function (xhr) {
                requests.push(xhr);
            };
        });

        afterEach(function() {
            this.xhr.restore();
        });

        describe('STATUS.NONE', function() {

            beforeEach(function() {
                ns.Model.define('test-model-none');

                this.model = ns.Model.create('test-model-none');
                this.promise = no.request('test-model-none');
            });

            afterEach(function() {
                this.model.invalidate();
            });

            it('should create http request for model', function() {
                expect(this.requests.length).to.be(1);
            });

            it('should not resolve promise immediately', function() {
                var result = false;
                this.promise.then(function() {
                    result = true;
                });

                expect(result).to.not.be.ok();
            });

            it('should increment retries', function() {
                expect(this.model.retries).to.be(1);
            });

            it('should set status to STATUS_LOADING', function() {
                expect(this.model.status).to.be(this.model.STATUS_LOADING);
            });

            it('should set requestID', function() {
                expect(this.model.requestID).to.be.ok();
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
            });
        });

        describe('STATUS.OK', function() {

            beforeEach(function() {
                var model = ns.Model.create('test-model');
                model.setData(true);
            });

            describe('regular', function() {
                it('should not create http request for model', function() {
                    no.request('test-model');
                    expect(this.requests.length).to.be(0);
                });

                it('should resolve promise immediately for model', function() {
                    var result = false;
                    no.request('test-model').then(function() {
                        result = true;
                    });

                    expect(result).to.be.ok();
                });
            });

            describe('forced', function() {

                beforeEach(function() {
                    this.requestPromise = no.forcedRequest('test-model');
                });

                afterEach(function() {
                    delete this.requestPromise;
                });

                it('should create http request for model', function() {
                    expect(this.requests.length).to.be(1);
                });

                it('should not resolve promise immediately', function() {
                    var result = false;
                    this.requestPromise.then(function() {
                        result = true;
                    });

                    expect(result).to.not.be.ok();
                });

                it('should resolve promise after response', function() {
                    var result = false;
                    this.requestPromise.then(function() {
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
                });
            });
        });

        describe('STATUS.ERROR', function() {

            beforeEach(function() {
                var model = ns.Model.create('test-model');
                model.status = model.STATUS.ERROR;
            });

            it('should not create http request for model', function() {
                no.request('test-model');
                expect(this.requests.length).to.be(0);
            });

            it('should resolve promise immediately for model', function() {
                var result = false;
                no.request('test-model').then(function() {
                    result = true;
                });

                expect(result).to.be.ok();
            });
        });

        describe('STATUS_LOADING', function() {

            beforeEach(function() {
                var model = ns.Model.create('test-model');
                model.status = model.STATUS_LOADING;
                model.promise = new no.Promise();
            });

            describe('regular', function() {
                it('should not create http request for model', function() {
                    no.request('test-model');
                    expect(this.requests.length).to.be(0);
                });

                it('should not resolve promise immediately for model', function() {
                    var result = false;
                    no.request('test-model').then(function() {
                        result = true;
                    });

                    expect(result).to.not.be.ok();
                });
            });

            describe('forced', function() {

                beforeEach(function() {
                    this.requestPromise = no.forcedRequest('test-model');
                });

                afterEach(function() {
                    delete this.requestPromise;
                });

                it('should create http request for model', function() {
                    expect(this.requests.length).to.be(1);
                });

                it('should not resolve promise immediately for model', function() {
                    var result = false;
                    this.requestPromise.then(function() {
                        result = true;
                    });

                    expect(result).to.not.be.ok();
                });
            });
        });

        describe('STATUS_FAILED', function() {

            beforeEach(function() {
                ns.Model.define('test-model-failed');

                this.model = ns.Model.create('test-model-failed');
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

                it('should set status to STATUS.ERROR', function() {
                    expect(this.model.status).to.be(this.model.STATUS.ERROR);
                });

                it('should resolve promise immediately', function() {
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

                it('should not resolve promise immediately', function() {
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

            ns.Model.define('test-model-addRequestParams');

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


    describe('requests combinations', function() {
        // ключ + forced. первый не парсится второй, все ресолвит

        describe('two equal requests', function() {

            beforeEach(function() {
                ns.Model.define('test-model-two-equal-requests');

                var promises = this.promises = [];

                sinon.stub(no, 'http', function() {
                    var promise = new no.Promise();
                    promises.push(promise);
                    return promise;
                });

                this.request1 = no.request('test-model-two-equal-requests');
                this.request2 = no.request('test-model-two-equal-requests');

                this.promises[0].resolve([{result: true}]);
            });

            afterEach(function() {
                delete this.request1;
                delete this.request2;
                delete this.promises;
                no.http.restore();
            });

            it('resolve first request', function() {
                var res = false;
                this.request1.then(function() {
                    res = true;
                });
                expect(res).to.be(true);
            });

            it('resolve second request', function() {
                var res = false;
                this.request2.then(function() {
                    res = true;
                });
                expect(res).to.be(true);
            });
        });

        describe('regular + force requests', function() {
            beforeEach(function() {
                ns.Model.define('test-model-two-equal-requests');

                var promises = this.promises = [];

                sinon.stub(no, 'http', function() {
                    var promise = new no.Promise();
                    promises.push(promise);
                    return promise;
                });

                this.request1 = no.request('test-model-two-equal-requests');
                this.request2 = no.forcedRequest('test-model-two-equal-requests');
            });

            afterEach(function() {
                delete this.request1;
                delete this.request2;
                delete this.promises;
                no.http.restore();
            });

            it('should create two requests', function() {
                expect(this.promises.length).to.be(2)
            });

            it('should not resolve first promise after first response', function() {
                this.promises[0].resolve([
                    {result: true}
                ]);

                expect(promiseIsResolved(this.request1)).to.be(false);
            });

            it('should not resolve second promise after first response', function() {
                this.promises[0].resolve([
                    {result: true}
                ]);

                expect(promiseIsResolved(this.request2)).to.be(false);
            });

            it('should resolve first promise after second response', function() {
                this.promises[1].resolve([
                    {result: 'second response1'}
                ]);

                expect(promiseIsResolved(this.request1)).to.be(true);
            });

            it('should resolve second promise after second response', function() {
                this.promises[1].resolve([
                    {result: 'second response2'}
                ]);

                expect(promiseIsResolved(this.request2)).to.be(true);
            });
        });
    });

    //TODO: STATUS.INVALID
    //TODO: xhr response parsing

    function promiseIsResolved(promise) {
        var res = false;
        promise.then(function() {
            res = true;
        });

        return res;
    }
});
