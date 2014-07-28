describe('ns.Update: ловля ошибок на разных стадиях.', function() {

    beforeEach(function() {
        ns.View.define('bad-view');
        ns.layout.define('bad', { 'bad-view': {} });
        var layout = ns.layout.page('bad');
        var view = ns.View.create('bad-view');
        this.update = new ns.Update(view, layout, {});

        ns.log.exception.restore();
        // блокируем вывод ошибок, он нам не нужен
        this.sinon.stub(ns.log, 'exception');
    });

    describe('#generateHTML()', function() {
        genTests('generateHTML', [
            '_requestSyncModels',
            '_generateHTML'
        ]);
    });

    describe('#reconstruct()', function() {
        genTests('reconstruct', [
            '_insertNodes'
        ]);
    });

    describe('#render()', function() {
        genTests('render', [
            '_requestAllModels',
            '_updateDOM',
            '_insertNodes'
        ]);
    });

    function genTests(updateMethodToCall, methodsThatCanThrowError) {
        methodsThatCanThrowError.forEach(function(method) {

            it('должен поймать ошибку и отреджектить промис, если #' + method + '() бросит исключение.', function() {
                this.sinon.stub(ns.Update.prototype, method).throws();

                return this.update[updateMethodToCall]()
                    .then(function() {
                        return Vow.reject('fulfilled');
                    }, function() {
                        return Vow.fulfill();
                    })
            });

            it('должен поймать ошибку и отреджектить промис, если #' + method + '() реджектит свой промис.', function() {
                this.sinon.stub(ns.Update.prototype, method).returns(Vow.reject('oops'));

                return this.update[updateMethodToCall]()
                    .then(function() {
                        return Vow.reject('fulfilled');
                    }, function() {
                        return Vow.fulfill();
                    })
            });

        });

    }

});
