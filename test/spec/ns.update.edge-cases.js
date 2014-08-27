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
});
