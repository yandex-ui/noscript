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
