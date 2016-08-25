describe('ns.request.js', function() {

    describe('ns.request()', function() {

        beforeEach(function() {
            this.sinon.stub(ns.request, 'models', no.nop);

            ns.Model.define('test-model');
            ns.Model.define('test-model2');
            ns.Model.define('test-model-with-params', {
                params: {
                    id: false
                }
            });
        });

        describe('ns.request("modelName")', function() {

            it('should call ns.request.models once', function() {
                ns.request('test-model');

                expect(ns.request.models.calledOnce).to.be.equal(true);
            });

            it('should call ns.request.models with requested model', function() {
                ns.request('test-model');

                var model = ns.Model.get('test-model');
                expect(
                    ns.request.models.calledWith([model])
                ).to.be.equal(true);
            });
        });

        describe('ns.request("modelName", params)', function() {

            beforeEach(function() {
                ns.request('test-model-with-params', {id: 1});
            });

            it('should call ns.request.models once', function() {
                expect(ns.request.models.calledOnce).to.be.equal(true);
            });

            it('should call ns.request.models with requested model', function() {
                var model = ns.Model.get('test-model-with-params', {id: 1});
                expect(
                    ns.request.models.calledWith([model])
                ).to.be.equal(true);
            });
        });

        describe('ns.request( ["modelName1", "modelName2"] )', function() {

            beforeEach(function() {
                ns.request(['test-model', 'test-model-with-params']);
            });

            it('should call ns.request.models once', function() {
                expect(ns.request.models.calledOnce).to.be.equal(true);
            });

            it('should call ns.request.models with requested models', function() {
                var model1 = ns.Model.get('test-model');
                var model2 = ns.Model.get('test-model-with-params', {});

                expect(
                    ns.request.models.calledWith([model1, model2])
                ).to.be.equal(true);
            });
        });

        describe('ns.request( ["modelName1", "modelName2"], params )', function() {

            beforeEach(function() {
                ns.request(['test-model', 'test-model-with-params'], {id: 1});
            });

            it('should call ns.request.models once', function() {
                expect(ns.request.models.calledOnce).to.be.equal(true);
            });

            it('should call ns.request.models with requested models', function() {
                var model1 = ns.Model.get('test-model');
                var model2 = ns.Model.get('test-model-with-params', {id: 1});

                expect(
                    ns.request.models.calledWith([model1, model2])
                ).to.be.equal(true);
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
                expect(ns.request.models.calledOnce).to.be.equal(true);
            });

            it('should call ns.request.models with requested models', function() {
                var model1 = ns.Model.get('test-model');
                var model2 = ns.Model.get('test-model-with-params', {id: 2});

                expect(
                    ns.request.models.calledWith([model1, model2])
                ).to.be.equal(true);
            });
        });

        describe('ns.request( [modelInstance] ) ->', function() {

            beforeEach(function() {
                ns.Model.define('model');

                this.modelInstance = ns.Model.get('model');
                ns.request([this.modelInstance]);
            });

            it('should call ns.request.models once', function() {
                expect(ns.request.models).to.have.callCount(1);
            });

            it('should call ns.request.models with given model instance', function() {
                expect(ns.request.models).to.be.calledWith([this.modelInstance]);
            });
        });

        describe('ns.request( [doModelInstance] ) ->', function() {

            beforeEach(function() {
                ns.Model.define('do-model');

                this.modelInstance = ns.Model.get('do-model');
                ns.request([this.modelInstance]);
            });

            it('should call ns.request.models once', function() {
                expect(ns.request.models).to.have.callCount(1);
            });

            it('should call ns.request.models with given model instance', function() {
                expect(ns.request.models).to.be.calledWith([this.modelInstance]);
            });
        });

        describe('ns.request( [modelInstance] ) ->', function() {

            beforeEach(function() {
                ns.Model.define('model');

                this.modelInstance = ns.Model.get('model');
                ns.request([this.modelInstance]);
            });

            it('should call ns.request.models once', function() {
                expect(ns.request.models).to.have.callCount(1);
            });

            it('should call ns.request.models with given model instance', function() {
                expect(ns.request.models).to.be.calledWith([this.modelInstance]);
            });
        });

        describe('ns.request( [doModelInstance] ) ->', function() {

            beforeEach(function() {
                ns.Model.define('do-model');

                this.modelInstance = ns.Model.get('do-model');
                ns.request([this.modelInstance]);
            });

            it('should call ns.request.models once', function() {
                expect(ns.request.models).to.have.callCount(1);
            });

            it('should call ns.request.models with given model instance', function() {
                expect(ns.request.models).to.be.calledWith([this.modelInstance]);
            });
        });

    });

    describe('ns.forcedRequest', function() {

        beforeEach(function() {
            ns.Model.define('test-forcedRequest');
            this.sinon.stub(ns.request, 'models');
        });

        it('should call ns.request.models with "forced" flag', function() {
            ns.forcedRequest('test-forcedRequest');

            expect(
                ns.request.models.getCall(0).args[1]['forced']
            ).to.be.equal(true);
        });
    });

    describe('ns.request.models()', function() {

        beforeEach(function() {
            ns.Model.define('test-model');
        });

        describe('STATUS.NONE', function() {

            beforeEach(function() {
                ns.Model.define('test-model-none');

                this.model = ns.Model.get('test-model-none');

                this.promise = ns.request('test-model-none');
            });

            it('should create http request for model', function() {
                expect(this.sinon.server.requests.length).to.be.equal(1);
            });

            it('should not resolve promise immediately', function() {
                var result = false;
                this.promise.then(function() {
                    result = true;
                });

                expect(result).to.be.equal(false);
            });

            it('should increment retries', function() {
                expect(this.model.retries).to.be.equal(1);
            });

            it('should set requestID', function() {
                expect(this.model.requestID).to.be.a('number');
            });

            it('should resolve promise after response', function(finish) {
                this.promise.then(function() {
                    finish();
                }, function() {
                    finish('rejected');
                });

                this.sinon.server.requests[0].respond(
                    200,
                    {"Content-Type": "application/json"},
                    JSON.stringify({
                        models: [
                            {data: true}
                        ]
                    })
                );
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
                    expect(this.sinon.server.requests.length).to.be.equal(0);
                });

                it('should resolve promise immediately for model', function(finish) {
                    ns.request('test-model').then(function() {
                        finish();
                    }, function() {
                        finish('rejected');
                    });
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
                    expect(this.sinon.server.requests.length).to.be.equal(1);
                });

                it('should resolve promise after response', function(finish) {
                    this.requestPromise.then(function() {
                        finish();
                    }, function() {
                        finish('rejected');
                    });

                    this.sinon.server.requests[0].respond(
                        200,
                        {"Content-Type": "application/json"},
                        JSON.stringify({
                            models: [
                                {data: true}
                            ]
                        })
                    );
                });
            });
        });

        describe('STATUS.ERROR', function() {

            beforeEach(function() {
                var model = ns.Model.get('test-model');
                model.status = model.STATUS.ERROR;
            });

            it('should create http request for model', function() {
                ns.request('test-model');
                expect(this.sinon.server.requests).to.have.length(1);
            });

        });

        // это тест самого ns.request.manager
        // тут поведение, когда запрос завершился с ошибкой
        describe('STATUS_FAILED', function() {

            beforeEach(function() {
                ns.Model.define('test-model-failed');

                this.promise = ns.request(['test-model-failed']);

                this.model = ns.Model.get('test-model-failed');
            });

            describe('common', function() {

                beforeEach(function(done) {
                    this.model.canRequest = this.sinon.spy(function() {
                        return false;
                    });

                    this.sinon.server.requests[0].respond(
                        500,
                        {"Content-Type": "application/json"},
                        JSON.stringify({
                            models: [
                                {data: false}
                            ]
                        })
                    );

                    window.setTimeout(function() {
                        done();
                    }, 100);
                });

                it('should call model.canRequest', function() {
                    expect(this.model.canRequest.calledOnce).to.be.equal(true);
                });

                it('should call model.canRequest with no args', function() {
                    expect(this.model.canRequest.calledWithExactly()).to.be.equal(true);
                });
            });

            describe('cant retry', function() {

                beforeEach(function(done) {
                    this.model.canRequest = function() {
                        return false;
                    };

                    this.sinon.server.requests[0].respond(
                        500,
                        {"Content-Type": "application/json"},
                        JSON.stringify({
                            models: [
                                {data: false}
                            ]
                        })
                    );

                    window.setTimeout(function() {
                        done();
                    }, 100);
                });

                it('should not create http request', function() {
                    expect(this.sinon.server.requests.length).to.be.equal(1);
                });

                it('should set status to STATUS.ERROR', function(done) {
                    this.promise.then(function() {
                        done('fulfill')
                    }, function() {
                        expect(this.model.status).to.be.equal(this.model.STATUS.ERROR);
                        done();
                    }, this);
                });

                it('should reject promise immediately', function(done) {
                    this.promise.then(function() {
                        done('fulfill');
                    }, function() {
                        done();
                    });
                });
            });

            describe('can retry', function() {

                beforeEach(function(done) {
                    this.sinon.server.requests[0].respond(
                        500,
                        {"Content-Type": "application/json"},
                        JSON.stringify({
                            models: [
                                {data: false}
                            ]
                        })
                    );

                    window.setTimeout(function() {
                        done();
                    }, 100);
                });

                it('should create second http request', function() {
                    expect(this.sinon.server.requests.length).to.be.equal(2);
                });
            });

            describe('#626 ограничение количества перезапросов при переопределении canRequest', function() {
                beforeEach(function(done) {
                    this.model.canRequest = function() {
                        return true;
                    };
                    var counts = [];
                    for (var i = 0; i < this.model.RETRY_LIMIT + 1; i++) {
                        counts.push(i);
                    }

                    // RETRY_LIMIT + 1 ответов с разницей в 100 мс,
                    // сервер все время отвечает 500 и подниматься не собирается.
                    // По идее, ns должен попробовать сделать RETRY_LIMIT запроса и на этом успокоиться
                    counts.forEach(function(i) {
                        window.setTimeout(function() {
                            var request = this.sinon.server.requests[i];

                            if (!request || i === counts[counts.length - 1]) {
                                return done();
                            }
                            request.respond(
                                500,
                                {"Content-Type": "application/json"},
                                JSON.stringify({
                                    models: [
                                        {data: false}
                                    ]
                                })
                            );
                        }.bind(this), i * 10);
                    }, this);
                });

                it('должен сделать RETRY_LIMIT запросов', function() {
                    expect(this.sinon.server.requests.length).to.be.equal(this.model.RETRY_LIMIT);
                });
            });
        });

        describe('do-model', function() {

            beforeEach(function() {
                ns.Model.define('do-test-model');
                ns.request('do-test-model');
            });

            it('should create http request for model', function() {
                expect(this.sinon.server.requests).to.have.length(1);
            });

        });

    });

    describe('addRequestParams', function() {

        beforeEach(function() {
            this.sinon.stub(ns, 'http', function() {
                return new Vow.Promise();
            });

            ns.Model.define('test-model-addRequestParams');

            this.originalParams = {
                a: 1,
                b: 2
            };
            ns.request.requestParams = no.extend({}, this.originalParams);
            this.sinon.spy(ns.request, 'addRequestParams');

            ns.request('test-model-addRequestParams');
        });

        it('request should call ns.request.addRequestParams', function() {
            expect(ns.request.addRequestParams.calledOnce).to.be.equal(true);
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

                this.sinon.stub(ns, 'http', function() {
                    var promise = new Vow.Promise();
                    promises.push(promise);
                    return promise;
                });

                this.request1 = ns.request('test-model-two-equal-requests');
                this.request2 = ns.request('test-model-two-equal-requests');

                this.promises[0].fulfill({
                    models: [
                        {data: true}
                    ]
                });
            });

            afterEach(function() {
                delete this.request1;
                delete this.request2;
                delete this.promises;
            });

            it('resolve first request', function(finish) {
                this.request1.then(function() {
                    finish();
                }, function() {
                    finish('reject');
                });
            });

            it('resolve second request', function(finish) {
                this.request2.then(function() {
                    finish();
                }, function() {
                    finish('reject');
                });
            });
        });

        describe('regular + force requests', function() {
            beforeEach(function() {
                ns.Model.define('test-model-two-equal-requests');

                var promises = this.promises = [];

                this.sinon.stub(ns, 'http', function() {
                    var promise = new Vow.Promise();
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
                expect(this.promises.length).to.be.equal(2);
            });

            it('should not resolve first promise after first response', function() {
                this.promises[0].fulfill({
                    models: [
                        {data: true}
                    ]
                });

                return this.promises[0].then(function() {
                    expect(this.request1.isFulfilled()).to.be.equal(false);
                }, null, this);
            });

            it('should not resolve second promise after first response', function() {
                this.promises[0].fulfill({
                    models: [
                        {data: true}
                    ]
                });

                return this.promises[0].then(function() {
                    expect(this.request2.isFulfilled()).to.be.equal(false);
                }, null, this);
            });

            it('should resolve first promise after second response', function(finish) {
                this.promises[1].fulfill({
                    models: [
                        {data: 'second response1'}
                    ]
                });

                this.request1.then(function() {
                    finish();
                }, function() {
                    finish('reject');
                });
            });

            it('should resolve second promise after second response', function(finish) {
                this.promises[1].fulfill({
                    models: [
                        { data: 'second response2' }
                    ]
                });

                this.request2.then(function() {
                    finish();
                }, function() {
                    finish('reject');
                });
            });
        });

        describe('Обычный запрос валидный модели + force запрос той же модели ->', function() {

            beforeEach(function() {
                ns.Model.define('test-model');

                // делаем модель валидной
                ns.Model.get('test-model').setData({type: 'old'});

                this.request1 = ns.forcedRequest('test-model');
                this.request2 = ns.request('test-model');
            });

            it('должен зарезолвить обычный запрос не дожидаясь force-запроса', function() {
                return this.request2;
            });

            it('должен зарезолвить обычный запрос cо старыми данными', function() {
                return this.request2.then(function(models) {
                    expect(models[0].get('.type')).to.be.equal('old');
                });
            });

            it('должен зарезолвить force-запрос после ответа сервера', function() {
                this.sinon.server.autoRespond = true;
                this.sinon.server.respond(function(xhr) {
                    xhr.respond(
                        200,
                        {"Content-Type": "application/json"},
                        JSON.stringify({
                            models: [
                                {
                                    data: {
                                        'type': 'new'
                                    }
                                }
                            ]
                        })
                    );
                });

                return this.request1;
            });

        });
    });

    describe('requests errors ->', function() {

        describe('вернули неправильное количество моделей', function() {

            beforeEach(function() {
                this.sinon.server.autoRespond = true;
                this.sinon.server.respond(function(xhr) {
                    xhr.respond(
                        200,
                        {"Content-Type": "application/json"},
                        JSON.stringify({
                            // возвращаем одну модель, хотя запрошено 2
                            models: [
                                {
                                    data: {
                                        'type': 'new'
                                    }
                                }
                            ]
                        })
                    );
                });

                // убираем перезапрос
                this.sinon.stub(ns.Model.prototype, 'RETRY_LIMIT', 1);

                ns.Model.define('m1');
                ns.Model.define('m2');
            });

            it('должен отреджектить промис', function() {
                return ns.request(['m1', 'm2']).then(function() {
                    return Vow.reject('ns.request MUST reject promise');
                }, function() {
                    return Vow.resolve();
                });
            });

            it('должен вернуть ошибку NO_DATA', function() {
                return ns.request(['m1', 'm2']).then(function() {
                    return Vow.reject('ns.request MUST reject promise');
                }, function(result) {
                    expect(result.invalid[0].getError()).to.have.property('id', 'NO_DATA');
                    return Vow.resolve();
                });
            });

        });

        describe('запрос завершился с ошибкой', function() {

            beforeEach(function() {
                this.sinon.stub(ns, 'http').returns(Vow.reject());
                ns.Model.define('model');
            });

            it('должен отреджектить промис для обычного запроса', function() {
                return ns.request('model').then(function() {
                    return Vow.reject('MUST REJECT PROMISE');
                }, function() {
                    return Vow.resolve();
                });
            });

            it('должен отреджектить промис для force-запроса', function() {
                return ns.forcedRequest('model').then(function() {
                    return Vow.reject('MUST REJECT PROMISE');
                }, function() {
                    return Vow.resolve();
                });
            });

        });

    });

    describe('do not reset model status to ok if it was in error status', function() {

        beforeEach(function() {
            ns.Model.define('model1');
            ns.Model.define('model2');

            this.sinon.server.autoRespond = true;
            this.sinon.server.respond(function(xhr) {
                xhr.respond(
                    200,
                    {"Content-Type": "application/json"},
                    JSON.stringify({
                        models: [
                            { error: 'unknown error' }
                        ]
                    })
                );
            });
        });

        it('if model was requested and request was done it does not mean that we model is ok', function(done) {
            var wait = 2;
            var handleModels = function(err) {
                var models = err.invalid;
                var model1 = models[0];
                var model2 = models[1];

                expect(model1.status).to.be.eql(ns.M.STATUS.ERROR);

                if (model2) {
                    expect(model2.status).to.be.eql(ns.M.STATUS.ERROR);
                }

                wait--;
                if (!wait) {
                    done();
                }
            };

            // Тут какая-то хитрая комбинация запросов должна была быть, чтобы в какой-то момент при запросе модели она бы оказалась
            // уже запрошена и мы бы просто проставили ей руками статус ok.

            ns.request([ 'model1', 'model2' ]).then(null, handleModels);
            ns.request('model1').then(null, handleModels);
        });

    });

    describe('Запрос одинаковых моделей и инвалидация во время запроса ->', function() {

        /*
         Тест на следующую ситуацию:
         Запрос0: m1 (invalid), m2 (invalid)
         Запрос1: m1 (invalid), m3 (invalid)

         Запрос1 запрашивает только модель m3 и завершается быстрее Запрос0.
         После завершения запроса Запрос0 инвалидируем m3

         Правильное поведение:
         Запрос0 резолвится после получения данных для m1,m2
         Запрос1 еще раз перезапрашивает m3 и резолвится с m1,m3
         */

        beforeEach(function() {
            this.respond = [
                200,
                {"Content-Type": "application/json"},
                JSON.stringify({
                    models: [
                        { data: {} }
                    ]
                })
            ];

            this.respond2 = [
                200,
                {"Content-Type": "application/json"},
                JSON.stringify({
                    models: [
                        { data: { 'r1': true } },
                        { data: { 'r2': true } }
                    ]
                })
            ];

            ns.Model.define('m1');
            ns.Model.define('m2');
            ns.Model.define('m3');

            this.sinon.spy(ns, 'http');

            // Запрос0
            this.request0 = ns.request(['m1', 'm2']);
            // Запрос1
            this.request1 = ns.request(['m1', 'm3']);

            // завершаем Запрос1
            var xhr1 = this.sinon.server.requests[1];
            xhr1.respond.apply(xhr1, this.respond);

            // после завершения обработки Запрос2 инвалидируем m3
            return ns.http.getCall(1).returnValue
                .then(function() {
                    // инвалидируем m3 из Запрос1
                    ns.Model.get('m3').invalidate();

                    // завершаем Запрос0
                    var xhr0 = this.sinon.server.requests[0];
                    xhr0.respond.apply(xhr0, this.respond2);
                }, null, this);
        });

        describe('Запросы завершаются удачно -> ', function() {

            it('должен завершить Запрос0 с m1,m2', function() {
                // ждем завершения Запрос2 и проверяем, что модели валидные
                return this.request0.then(function(models) {
                    models.forEach(function(model) {
                        expect(model.isValid(), model.id).to.be.equal(true);
                    });

                    try {
                        var xhr2 = this.sinon.server.requests[2];
                        xhr2.respond.apply(xhr2, this.respond);
                    } catch(e){}
                }, null, this);
            });

            it('должен перезапросить m3 и завершить Запрос1 с m1,m3', function() {
                return this.request0.then(function() {
                    // завершаем перезапрос Запрос0
                    var xhr2 = this.sinon.server.requests[2];
                    expect(xhr2, 'NO_REQUEST_FOR_M3').to.be.an('object');
                    xhr2.respond.apply(xhr2, this.respond);

                    return this.request1.then(function(models) {
                        models.forEach(function(model) {
                            expect(model.isValid(), model.id).to.be.equal(true);
                        });
                    });
                }, null, this);
            });

        });

        describe('Перезапрос m3 завершается неудачно', function() {

            it('должен перезапросить m3 не больше чем RETRY_LIMIT и отреджектить промис', function() {
                return this.request0.then(function() {

                    this.sinon.server.autoRespond = true;
                    this.sinon.server.respond(function(xhr) {
                        if (xhr.readyState !== 1) {
                            return;
                        }
                        xhr.respond(
                            500,
                            {"Content-Type": "application/json"},
                            JSON.stringify({
                                models: [
                                    { error: 'unknown error' }
                                ]
                            })
                        );
                    });

                    return this.request1.then(function() {
                        return Vow.reject('RESOLVED');
                    }, function() {
                        var m3Requests = this.sinon.server.requests.filter(function(xhr) {
                            // фильтруем неудачные запросы за m3
                            return xhr.url.indexOf('?_m=m3') > -1 && xhr.status === 500;
                        });
                        expect(m3Requests).to.have.length(3 /* RETRY_LIMIT */);
                    }, this);
                }, null, this);
            })

        });

    });

    describe('Исправления моделями ошибки запроса ->', function() {

        beforeEach(function() {
            this.sinon.spy(ns, 'request');
            this.sinon.spy(ns, 'forcedRequest');

            // эмулируем последовательность запросов
            var xsrfTokenResponse = {
                models: [{
                    data: {'token': 'new'}
                }]
            };

            var invalidTokenResponse = {
                models: [{
                    error: {type: 'INVALID_TOKEN'}
                }]
            };

            var validTokenResponse = {
                models: [{
                    data: {status: 'ok'}
                }]
            };

            var nsHttpString = this.sinon.stub(ns, 'http');
            nsHttpString.withArgs('/models/?_m=xsrf-token')
                .returns(Vow.resolve(xsrfTokenResponse));

            nsHttpString.withArgs('/models/?_m=do-model-fixable')
                .onCall(0).returns(Vow.resolve(invalidTokenResponse))
                .onCall(1).returns(Vow.resolve(validTokenResponse));

            nsHttpString.withArgs('/models/?_m=model-fixable')
                .onCall(0).returns(Vow.resolve(invalidTokenResponse))
                .onCall(1).returns(Vow.resolve(validTokenResponse));
        });

        describe('Обычная модель ->', function() {

            beforeEach(function() {

                ns.Model.define('xsrf-token', {});

                ns.Model.define('model-fixable', {

                    methods: {

                        isErrorCanBeFixed: function(error) {
                            return error && error.type === 'INVALID_TOKEN';
                        },

                        fixError: function() {
                            return ns.request(['xsrf-token']);
                        }

                    }

                });

                this.model = ns.Model.get('model-fixable');

                return ns.forcedRequest([this.model]);
            });

            it('модель должна стать валидной', function() {
                expect(this.model.isValid()).to.be.equal(true);
            });

            it('должен выполнить все перезапросы', function() {
                expect(ns.http).to.have.callCount(3);
            });

        });

        describe('do-модель ->', function() {

            beforeEach(function() {

                ns.Model.define('xsrf-token', {});

                ns.Model.define('do-model-fixable', {

                    methods: {

                        isErrorCanBeFixed: function(error) {
                            return error && error.type === 'INVALID_TOKEN';
                        },

                        fixError: function() {
                            return ns.request(['xsrf-token']);
                        }

                    }

                });

                this.model = ns.Model.get('do-model-fixable');

                return ns.forcedRequest([this.model]);
            });

            it('модель должна стать валидной', function() {
                expect(this.model.isValid()).to.be.equal(true);
            });

            it('должен выполнить все перезапросы', function() {
                expect(ns.http).to.have.callCount(3);
            });

        });

    });

});
