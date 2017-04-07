describe('ns.Update. Синтетические случаи', function() {

    describe('Виды должны обновлять то, что отрендерили', function() {

        // это синтетический тест на проверку того, что рендериг и обновление DOM происходят синхронно

        it('должен сихронно отрендерить html и вставить его в DOM', function() {

            this.sinon.spy(ns.View.prototype, '_getUpdateTree');
            this.sinon.spy(ns.View.prototype, '_updateHTML');

            var originalMethod = ns.Update.prototype._updateDOM;
            this.sinon.stub(ns.Update.prototype, '_updateDOM', function() {
                var result = originalMethod.call(this);

                // не придумал лучше способа как сделать такую проверку :(
                expect(ns.View.prototype._getUpdateTree).to.have.callCount(1);
                expect(ns.View.prototype._updateHTML).to.have.callCount(1);

                return result;
            });

            ns.View.define('app');
            return ns.View.create('app').update();
        });
    });


    describe('Состояние async-view определяется один раз за update и не пересчитывается динамически', function() {

        // Это синтетический тест и на данный момент такого в реальности быть не может

        // Cейчас работоспособность этого случая обеспечивается исключительно синхронностью вызова методов
        // ns.View#_getUpdateTree() -> ns.Update#render() -> ns.View._updateHTML() в ns.Update#_update()
        // Т.е. заменив какую-то часть на асинхронную, мы напоримсся на странный баг,
        // когда вроде бы асинхронный вид отрисовал ns-view-async-content и так в нем и остался

        // Баг заключается в том, что в ns.View._updateHTML() состояние async определеяется не по ранее рассчитанному флагу,
        // которое попало в дерево отрисовки, а заново на основе isModelsValid()
        // 1 - это в корне неверно, потому что состояние должно определяться из того, что отрисовали
        // 2 - это лишние вызовы


        beforeEach(function(done) {
            this.htmlinitSpy = this.sinon.spy();
            this.asyncSpy = this.sinon.spy();

            ns.layout.define('app', {
                'app': {
                    'async&': true
                }
            });

            ns.Model.define('model-async');

            /// Views
            ns.View.define('app');
            ns.View.define('async', {
                events: {
                    'ns-view-async': this.asyncSpy,
                    'ns-view-htmlinit': this.htmlinitSpy
                },
                models: ['model-async']
            });

            ns.Update.prototype._render = ns.Update.prototype.render;
            this.sinon.stub(ns.Update.prototype, 'render', function() {
                ns.Model.get('model-async').setData({});
                return this._render.apply(this, arguments);
            });

            var view = ns.View.create('app');
            var layout = ns.layout.page('app', {});
            new ns.Update(view, layout, {})
                .start()
                .then(function() {
                    done();
                });
        });

        it('не должно быть события ns-view-htmlinit', function() {
            expect(this.htmlinitSpy).to.not.be.called;
        });

        it('должно быть событиt ns-view-async', function() {
            expect(this.asyncSpy).to.be.calledOnce;
        });

    });

    describe('Инвалидация валидного вида во время запроса моделей для невалидных видов ->', function() {

        /*
         Дано:
         Есть вид v1, он зависит от модель m1. Он валиден.
         Есть вид v2, он зависит от модели m2. Он невалиден.

         Старое поведение:
         v1 не сообщает свои модели, а v2 сообщает.
         В ns.request уходят знания только про m2.

         Допустим в процессе запроса m2 кто-то инвалидировал модель m1.
         Про ее необходимость никто не знает,
         соответственно дело нормальным способом дойдет до отрисовки,
         где m1 будет перерисован как error-content (это проблема)
         */

        beforeEach(function() {
            ns.Model.define('m1');
            ns.Model.define('m2');

            ns.Model.get('m1').setData({});
            ns.Model.get('m2').setData({});

            ns.View.define('v1', {models: ['m1']});
            ns.View.define('v2', {models: ['m2']});
            ns.View.define('app');

            ns.layout.define('app', {
                'app': {
                    'v1': {
                        'v2': {}
                    }
                }
            });

            this.view = ns.View.create('app');
            this.layout = ns.layout.page('app');
            return new ns.Update(this.view, this.layout, {}).render()
                .then(function() {
                    this.v1Node = this.view.node.querySelector('.ns-view-v1');
                    this.v2Node = this.view.node.querySelector('.ns-view-v2');

                    // заставляем перерисоваться v2 и сделать http-запрос
                    ns.Model.get('m2').invalidate();

                    this.sinon.server.autoRespond = true;
                    this.sinon.server.respond(function(xhr) {
                        if (xhr.url.indexOf('m1') === -1) {
                            // пытаемся заставить уйти v1 в error-content
                            // если все ок, то будет перезапрос модели m1
                            ns.Model.get('m1').invalidate();
                        }

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
                }, null, this);
        });

        it('должен нормально завершить отрисовку', function() {
            return new ns.Update(this.view, this.layout, {}).render();
        });

        it('должен запросить m2 и m1', function() {
            return new ns.Update(this.view, this.layout, {}).render()
                .then(function() {
                    expect(this.sinon.server.requests).to.have.length(2);
                }, null, this);
        });

        it('должен перерисовать v1', function() {
            return new ns.Update(this.view, this.layout, {}).render()
                .then(function() {
                    var newNode = this.view.node.querySelector('.ns-view-v1');
                    expect(newNode.getAttribute('data-random')).to.not.equal(this.v1Node.getAttribute('data-random'));
                }, null, this);
        });

        it('должен перерисовать v2', function() {
            return new ns.Update(this.view, this.layout, {}).render()
                .then(function() {
                    var newNode = this.view.node.querySelector('.ns-view-v2');
                    expect(newNode.getAttribute('data-random')).to.not.equal(this.v2Node.getAttribute('data-random'));
                }, null, this);
        });

    });

    describe('Недорисованный async-view внутри бокса должен скрываться, если его больше нет в раскладке', function() {

        beforeEach(function() {

            ns.layout.define('page1', {
                'app': {
                    'box@': {
                        'view1&': {}
                    }
                }
            });

            ns.layout.define('page2', {
                'app': {
                    'box@': {
                        'view2': {}
                    }
                }
            });

            ns.Model.define('model-async');
            ns.Model.get('model-async').setData({data: true});

            ns.View.define('app');
            ns.View.define('view1', {models: ['model-async']});
            ns.View.define('view2');

            this.view = ns.View.create('app');
            var layout1 = ns.layout.page('page1');
            var layout2 = ns.layout.page('page2');

            return new ns.Update(this.view, layout1, {})
                // рисуем "view1&" - все ок
                .render()
                // переключаем на "view2" - все ок
                .then(function() {
                    return new ns.Update(this.view, layout2, {}).render();
                }, null, this)
                // инвалидируем модель для на "view1&", чтобы вид остался в async-состоянии
                // переключаем на "view1&"
                .then(function() {
                    ns.Model.get('model-async').invalidate();
                    return new ns.Update(this.view, layout1, {}).render();
                }, null, this)
                // переключаем на "view2"
                // Баг в том, что "view1&" не будет скрыт
                .then(function() {
                    return new ns.Update(this.view, layout2, {}).render();
                }, null, this);
        });

        it('должен скрыть "view1&"', function() {
            expect(this.view.node.querySelectorAll('.ns-view-view1')).to.have.length(0);
        });

    });

    it('Не должен вызывать ns.request.models, если все модели валидные', function() {
        /*
         Этот тест решает следующую задачу:

         Если вид view и модель model. Оба валидны и имеют данные.
         Кто-то в приложении сделал ns.forcedRequest('model').
         Если теперь запустить обновление на view, то оно не завершится, пока не завершится запрос за моделью model, потому что он forced.
         Это происходит, потому что Update безусловно все модели отправляет в ns.request для контроля их валидности.
        */

        this.sinon.spy(ns.request, 'models');

        ns.Model.define('model');
        ns.Model.get('model').setData({});
        ns.View.define('view', { models: ['model'] });

        return ns.View.create('view')
            .update()
            .then(function() {
                expect(ns.request.models).to.have.callCount(0);
            });
    });

    xdescribe('Если на момент обновления DOM-а одна из моделей в status=invalid => ns.Update должен абортиться =>', function() {
        beforeEach(function() {
            ns.Model.define('m1');
            ns.Model.get('m1').setData({});

            ns.View.define('app');
            ns.View.define('v1', { models: [ 'm1' ] });

            ns.layout.define('app', {
                'app': {
                    'v1': {}
                }
            });

            this.sinon.server.autoRespond = true;
            this.sinon.server.respond(function(xhr) {
                xhr.respond(
                    200,
                    { 'Content-Type': 'application/json' },
                    JSON.stringify({
                        models: [
                            { data: true }
                        ]
                    })
                );
            });

            this.view = ns.View.create('app');
            this.layout = ns.layout.page('app');

            this.firstUpdateDone = this.sinon.spy();

            return new ns.Update(this.view, this.layout, {}).render()
                .then(this.firstUpdateDone);
        });

        it('первый ns.Update успешно выполняется', function() {
            expect(this.firstUpdateDone).to.have.callCount(1);
        });

        describe('после запроса моделей кто-то успевает вызвать invalidate у модели m1 =>', function() {
            beforeEach(function() {
                var origRequestAllModels = ns.Update.prototype._requestAllModels;
                ns.Update.prototype._requestAllModels = function() {
                    var resultPromise = origRequestAllModels.apply(this, arguments);
                    resultPromise.then(function() {
                        ns.Model.get('m1').invalidate();
                    });
                    return resultPromise;
                };

                this.update = new ns.Update(this.view, this.layout, {});
            });

            it('второй ns.Update не должен завершиться', function(finish) {
                this.update.render()
                    .then(function() {
                        finish('second ns.Update should not resolve');
                    }, function(result) {
                        try {
                            expect(result.error).to.be.equal(ns.U.STATUS.EXPIRED);
                            finish();
                        } catch(e) {
                            finish(e);
                        }
                    });
            })

            // it('', function() {
            //     expect(this.secondUpdateDone).to.have.callCount(0);
            // });

            // it('у второго ns.Update должен вызваться abort', function() {
            //     expect(this.update.abort).to.have.callCount(1);
            // });
        });
    });
});
