describe('хелперы yate', function() {

    describe('доступ к данными модели', function() {

        beforeEach(function() {
            ns.Update.handleError = no.true;

            ns.Model.define('a');
            ns.Model.define('b', {methods: {canRequest: no.false}});
            ns.Model.define('c');

            ns.View.define('test-yate-helper-model', {
                models: {
                    a: true,
                    b: false
                }
            });

            ns.Model.get('a').setData('model-a-data');
            ns.Model.get('b').setError('model-b-error');

            var view = ns.View.create('test-yate-helper-model', {});

            return view
                .update()
                .then(function() {
                    this.result = view.node.innerHTML;
                }, null, this);
        });

        afterEach(function() {
            delete this.result;
        });

        it('model() должен вернуть данные валидной модели', function() {
            expect(this.result).to.have.string('<div class="data">model-a-data</div>');
        });

        it('model() не должен вернуть данные невалидной модели', function() {
            expect(this.result).to.not.have.string('<div class="data">model-b-error</div>');
        });

        it('modelError() должен вернуть ошибку невалидной модели', function() {
            expect(this.result).to.have.string('<div class="error">model-b-error</div>');
        });

        it('modelError() не должен вернуть ошибку валидной модели', function() {
            expect(this.result).to.not.have.string('<div class="error">model-a-data</div>');
        });

    });

});
