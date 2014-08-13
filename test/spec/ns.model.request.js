describe('ns.Model#request', function() {

    beforeEach(function() {

        ns.Model.define('model', {
            methods: {
                request: function() {
                    return ns.http('https://api.twitter.com', {
                        foo: 1,
                        bar: 2
                    }, {type: 'GET'})
                        .then(function(data) {
                            this.setData(data);
                        }, function(error) {
                            this.setError(error);
                        }, this);
                }
            }
        });
    });

    describe('запрос модели с собственным запросом', function() {

        beforeEach(function() {
            this.model = ns.Model.get('model');
            this.request = ns.request([this.model]);
        });

        afterEach(function() {
            delete this.model;
            delete this.request;
        });

        it('должен сделать 1 запрос', function() {
            expect(this.sinon.server.requests).to.have.length(1);
        });

        it('должен сделать запрос, который сказала модель', function() {
            expect(this.sinon.server.requests[0].url).to.be.equal('https://api.twitter.com?foo=1&bar=2');
        });

        it('не должен заполнить промис пока не завершится', function() {
            expect(this.request.isResolved()).be.equal(false);
        });

        describe('завершение запроса', function() {

            it('должен зарезолвить промис, когда запрос завершился', function(done) {
                this.sinon.server.requests[0].respond(
                    '200',
                    { "Content-Type": "application/json" },
                    '{ "models": [ { "data": {} } ] }'
                );

                this.request.then(function() {
                    done()
                }, function(err) {
                    done(err);
                })
            });

            describe('перезапрос', function() {

                beforeEach(function() {
                    // инвалидируем и запршиваем еще раз
                    // это проверка, что менеджер удалил модель из запрашиваемых
                    this.model.invalidate();
                    this.request = ns.request([this.model]);
                });

                afterEach(function() {
                    delete this.request;
                });

                it('должен сделать 1 запрос', function() {
                    expect(this.sinon.server.requests).to.have.length(1);
                });

                it('должен сделать запрос, который сказала модель', function() {
                    expect(this.sinon.server.requests[0].url).to.be.equal('https://api.twitter.com?foo=1&bar=2');
                });

            });

        });

        describe('второй такой же запрос', function() {

            beforeEach(function() {
                this.request1 = ns.request([this.model]);
            });

            afterEach(function() {
                delete this.request1;
            });

            it('не должен сделать запрос', function() {
                expect(this.sinon.server.requests).to.have.length(1);
            });

            describe('завершение', function() {

                beforeEach(function() {
                    this.sinon.server.requests[0].respond(
                        '200',
                        { "Content-Type": "application/json" },
                        '{ "models": [ { "data": {} } ] }'
                    );
                });

                it('должен зарезолвить 1-й промис, когда запрос завершился', function(done) {
                    this.request.then(function() {
                        done()
                    }, function(err) {
                        done(err);
                    })
                });

                it('должен зарезолвить 2-й промис, когда запрос завершился', function(done) {
                    this.request1.then(function() {
                        done()
                    }, function(err) {
                        done(err);
                    })
                });

            });

        });

    });

    describe('запрос обычной модели и с #request', function() {

        beforeEach(function() {

            var data = {
                'https://api.twitter.com?foo=1&bar=2': {
                    fromModel: 'model'
                },
                '/models/?_m=regular-model': {
                    "models": [
                        { "data": { fromModel: 'regular-model' } }
                    ]
                }
            };

            this.sinon.server.autoRespond = true;
            this.sinon.server.respond(function(xhr) {
                xhr.respond(
                    '200',
                    { "Content-Type": "application/json" },
                    JSON.stringify(data[xhr.url])
                );
            });


            ns.Model.define('regular-model');

            this.request = ns.request(['model', 'regular-model']);
        });

        it('должен сделать 2 запроса', function() {
            expect(this.sinon.server.requests).to.have.length(2);
        });

        it('должен зарезолвить промис, когда запрос завершился', function(done) {
            this.request.then(function() {
                done()
            }, function(err) {
                done(err);
            })
        });

        it('должен сохранить правильные данные для обычной модели', function() {
            return this.request.then(function() {
                expect(ns.Model.get('regular-model').getData()).to.be.eql({
                    fromModel: 'regular-model'
                });
            });
        });

        it('должен сохранить правильные данные для модели с собственным запросом', function() {
            return this.request.then(function() {
                expect(ns.Model.get('model').getData()).to.be.eql({
                    fromModel: 'model'
                });
            });
        });
    });

});
