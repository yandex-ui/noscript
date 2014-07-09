describe('хелперы yate', function() {

    // после изменения ns.View#tmpl не знаю как правильно это описать
    xdescribe('доступ к данными модели', function() {

        beforeEach(function() {
            ns.Model.define('a');
            ns.Model.define('b');
            ns.Model.define('c');

            ns.View.define('test-yate-helper-model', {
                models: {
                    a: true,
                    b: false
                }
            });

            ns.Model.get('a').setData('model-a-data');
            ns.Model.get('b').setError('model-b-error');

            this.result = ns.View.create('test-yate-helper-model', {}, false).tmpl().innerHTML;
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
