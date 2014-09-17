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

    describe('Инвалидация моделей в момент запроса приводит к перезапросу моделей', function() {

        beforeEach(function() {
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


            ns.layout.define('page', {
                'view1': {
                    'view2': {}
                }
            });

            ns.Model.define('model1');
            ns.Model.define('model2');

            ns.View.define('view1', { models: ['model1'] });
            ns.View.define('view2', { models: ['model2'] });

            ns.Model.get('model1').setData({});

            // имитируем, что приходим в _updateDOM с невалидными моделями
            var that = this;
            this.restartLimit = 1;
            var restartCount = 0;
            ns.Update.prototype.__stubStartUpdateDOM = ns.Update.prototype._startUpdateDOM;
            this.sinon.stub(ns.Update.prototype, '_startUpdateDOM', function() {
                if (restartCount < that.restartLimit) {
                    ns.Model.get('model1').invalidate({});
                    restartCount++;
                }

                return this.__stubStartUpdateDOM();
            });

            this.view = ns.View.create('view1');
            this.layout = ns.layout.page('page');
        });

        afterEach(function() {
            delete ns.Update.prototype.__stubStartUpdateDOM;
        });

        it('должен перезапросить и отрисовать виды', function() {
            return new ns.Update(this.view, this.layout).render();
        });

        it('должен завершить update с ошибкой при превышении лимита', function() {
            this.restartLimit = 2;
            return new ns.Update(this.view, this.layout)
                .render()
                .then(function() {
                    throw new Error('fulfilled');
                }, function(err) {
                    expect(err.error).to.be.equal(ns.U.STATUS.MODELS);
                });
        });

        it('должен отрисовать виды с ошибкой при превышении лимита, если разрешил handleError', function() {
            this.restartLimit = 2;
            this.sinon.stub(ns.Update, 'handleError').returns(true);

            return new ns.Update(this.view, this.layout)
                .render()
                .then(function() {
                    expect(this.view.node.outerHTML).to.contain('test ns-view-error-content');
                }, null, this);
        });

    });
});
