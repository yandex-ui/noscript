describe('ns.request.js', function() {

    describe('ns.request()', function() {

        beforeEach(function() {
            sinon.stub(ns.request, 'models', no.nop);

            ns.Model.define('test-model');
            ns.Model.define('test-model2');
            ns.Model.define('test-model-with-params', {
                params: {
                    id: false
                }
            });
        });

        afterEach(function() {
            ns.request.models.restore();
        });

        describe('ns.request("modelName")', function() {

            it('should call ns.request.models once', function() {
                ns.request('test-model');

                expect(ns.request.models.calledOnce).to.be.ok();
            });

            it('should call ns.request.models with requested model', function() {
                ns.request('test-model');

                var model = ns.Model.get('test-model');
                expect(
                    ns.request.models.calledWith([model])
                ).to.be.ok();
            });
        });

        describe('ns.request("modelName", params)', function() {

            beforeEach(function() {
                ns.request('test-model-with-params', {id: 1});
            });

            it('should call ns.request.models once', function() {
                expect(ns.request.models.calledOnce).to.be.ok();
            });

            it('should call ns.request.models with requested model', function() {
                var model = ns.Model.get('test-model-with-params', {id: 1});
                expect(
                    ns.request.models.calledWith([model])
                ).to.be.ok();
            });
        });

        describe('ns.request( ["modelName1", "modelName2"] )', function() {

            beforeEach(function() {
                ns.request(['test-model', 'test-model-with-params']);
            });

            it('should call ns.request.models once', function() {
                expect(ns.request.models.calledOnce).to.be.ok();
            });

            it('should call ns.request.models with requested models', function() {
                var model1 = ns.Model.get('test-model');
                var model2 = ns.Model.get('test-model-with-params', {});

                expect(
                    ns.request.models.calledWith([model1, model2])
                ).to.be.ok();
            });
        });

        describe('ns.request( ["modelName1", "modelName2"], params )', function() {

            beforeEach(function() {
                ns.request(['test-model', 'test-model-with-params'], {id: 1});
            });

            it('should call ns.request.models once', function() {
                expect(ns.request.models.calledOnce).to.be.ok();
            });

            it('should call ns.request.models with requested models', function() {
                var model1 = ns.Model.get('test-model');
                var model2 = ns.Model.get('test-model-with-params', {id: 1});

                expect(
                    ns.request.models.calledWith([model1, model2])
                ).to.be.ok();
            });
        });

        describe('ns.request( [{id: "modelName1"}] )', function() {

            beforeEach(function() {
                ns.request([
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

            it('should call ns.request.models once', function() {
                expect(ns.request.models.calledOnce).to.be.ok();
            });

            it('should call ns.request.models with requested models', function() {
                var model1 = ns.Model.get('test-model');
                var model2 = ns.Model.get('test-model-with-params', {id: 2});

                expect(
                    ns.request.models.calledWith([model1, model2])
                ).to.be.ok();
            });
        });

    });

    describe('ns.forcedRequest', function() {

        beforeEach(function() {
            ns.Model.define('test-forcedRequest');
            sinon.stub(ns.request, 'models', no.nop);
        });

        afterEach(function() {
            ns.request.models.restore();
        });

        it('should call ns.request.models with "forced" flag', function() {
            ns.forcedRequest('test-forcedRequest');

            expect(
                ns.request.models.getCall(0).args[1]['forced']
            ).to.be(true);
        });
    });

    describe('no.reques.models()', function(){

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

                this.model = ns.Model.get('test-model-none');
                this.promise = ns.request('test-model-none');
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
                    JSON.stringify({
                        models: [
                            {data: true}
                        ]
                    })
                );

                expect(result).to.be.ok();
            });
        });

        describe('STATUS.OK', function() {

            beforeEach(function() {
                var model = ns.Model.get('test-model');
                model.setData(true);
            });

            describe('regular', function() {
                it('should not create http request for model', function() {
                    ns.request('test-model');
                    expect(this.requests.length).to.be(0);
                });

                it('should resolve promise immediately for model', function() {
                    var result = false;
                    ns.request('test-model').then(function() {
                        result = true;
                    });

                    expect(result).to.be.ok();
                });
            });

            describe('forced', function() {

                beforeEach(function() {
                    this.requestPromise = ns.forcedRequest('test-model');
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
                        JSON.stringify({
                            models: [
                                {data: true}
                            ]
                        })
                    );

                    expect(result).to.be.ok();
                });
            });
        });

        /*
        describe('STATUS.ERROR', function() {

            beforeEach(function() {
                var model = ns.Model.get('test-model');
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
                var model = ns.Model.get('test-model');
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

                this.model = ns.Model.get('test-model-failed');
                this.model.status = ns.M.STATUS.FAILED;
            });

            describe('common', function() {

                beforeEach(function() {
                    this.model.canRetry = sinon.spy(function() {
                        return false;
                    });

                    this.promise = ns.request.models([this.model]);
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
                    this.promise = ns.request.models([this.model]);
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
                    this.promise = ns.request.models([this.model]);
                });

                it('should create http request', function() {
                    expect(this.requests.length).to.be(1);
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
        */

    });

    describe('addRequestParams', function() {

        beforeEach(function() {
            sinon.stub(ns, 'http', function() {
                return new no.Promise();
            });

            ns.Model.define('test-model-addRequestParams');

            this.originalParams = {
                a: 1,
                b: 2
            };
            ns.request.requestParams = no.extend({}, this.originalParams);
            sinon.spy(ns.request, 'addRequestParams');

            ns.request('test-model-addRequestParams');
        });

        afterEach(function() {
            ns.request.addRequestParams.restore();
            ns.http.restore();
        });

        it('request should call ns.request.addRequestParams', function() {
            expect(ns.request.addRequestParams.calledOnce).to.be.ok();
        });

        it('request should add ns.request.requestParams to xhr.params', function() {
            for (var prop in ns.request.requestParams) {
                expect(ns.http.getCall(0).args[1]).to.have.property(prop, ns.request.requestParams[prop]);
            }
        });

        it('request should not modify ns.request.requestParams', function() {
            expect(ns.request.requestParams).to.eql(this.originalParams);
        });

    });


    describe('requests combinations', function() {
        // ключ + forced. первый не парсится второй, все ресолвит

        describe('two equal requests', function() {

            beforeEach(function() {
                ns.Model.define('test-model-two-equal-requests');

                var promises = this.promises = [];

                sinon.stub(ns, 'http', function() {
                    var promise = new no.Promise();
                    promises.push(promise);
                    return promise;
                });

                this.request1 = ns.request('test-model-two-equal-requests');
                this.request2 = ns.request('test-model-two-equal-requests');

                this.promises[0].resolve({
                    models: [
                        {data: true}
                    ]
                });
            });

            afterEach(function() {
                delete this.request1;
                delete this.request2;
                delete this.promises;
                ns.http.restore();
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

                sinon.stub(ns, 'http', function() {
                    var promise = new no.Promise();
                    promises.push(promise);
                    return promise;
                });

                this.request1 = ns.request('test-model-two-equal-requests');
                this.request2 = ns.forcedRequest('test-model-two-equal-requests');
            });

            afterEach(function() {
                delete this.request1;
                delete this.request2;
                delete this.promises;
                ns.http.restore();
            });

            it('should create two requests', function() {
                expect(this.promises.length).to.be(2)
            });

            it('should not resolve first promise after first response', function() {
                this.promises[0].resolve({
                    models: [
                        {data: true}
                    ]
                });

                expect(promiseIsResolved(this.request1)).to.be(false);
            });

            it('should not resolve second promise after first response', function() {
                this.promises[0].resolve({
                    models: [
                        {data: true}
                    ]
                });

                expect(promiseIsResolved(this.request2)).to.be(false);
            });

            it('should resolve first promise after second response', function() {
                this.promises[1].resolve({
                    models: [
                        {data: 'second response1'}
                    ]
                });

                expect(promiseIsResolved(this.request1)).to.be(true);
            });

            it('should resolve second promise after second response', function() {
                this.promises[1].resolve({
                    models: [
                        {data: 'second response2'}
                    ]
                });

                expect(promiseIsResolved(this.request2)).to.be(true);
            });
        });
    });

    describe('custom request', function() {
        beforeEach(function() {
            ns.Model.define('simple-model');
            ns.Model.define('custom-request-model', {
                request: {
                    method: 'GET',
                    url: '/my/model'
                }
            });

            this.xhr = sinon.useFakeXMLHttpRequest();
            var requests = this.requests = [];

            this.xhr.onCreate = function (xhr) {
                requests.push(xhr);
            };
        });

        afterEach(function() {
            this.xhr.restore();
        });

        it('should load model with custom options', function() {
            ns.Model.get('custom-request-model');
            ns.request('custom-request-model');
            expect(this.requests.length).to.be(1);
            expect(this.requests[0].method).to.be('GET');
            expect(this.requests[0].url).to.be('/my/model');
        });

        it('should load models from custom and common url simultaneously', function() {
            ns.Model.get('simple-model');
            ns.Model.get('custom-request-model');
            ns.request(['simple-model', 'custom-request-model']);
            expect(this.requests.length).to.be(2);
            expect(this.requests[0].method).to.be('GET');
            expect(this.requests[0].url).to.be('/my/model');

            expect(this.requests[1].method).to.be('POST');
            expect(this.requests[1].url).to.be('/models/?_m=simple-model');
        });

        describe('response handling', function() {
            beforeEach(function() {
                ns.Model.get('simple-model');
                ns.Model.get('custom-request-model');
                ns.request(['simple-model', 'custom-request-model']);
            });

            it('should update custom model', function() {
                this.requests[0].respond(
                    200,
                    {"Content-Type": "application/json"},
                    JSON.stringify({
                        data: {content: 'i came from custom url'}
                    })
                );
                expect(ns.Model.get('custom-request-model').getData()).to.eql({content: 'i came from custom url'});
            });

            it('should update simple model after batch response', function() {
                this.requests[1].respond(
                    200,
                    {"Content-Type": "application/json"},
                    JSON.stringify({
                        models: [{data: {content: 'i am simple'}}]
                    })
                );
                expect(ns.Model.get('simple-model').getData()).to.eql({content: 'i am simple'});
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
