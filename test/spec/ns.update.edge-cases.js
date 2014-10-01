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

});
