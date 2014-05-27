describe('ns-generate-url', function() {

    beforeEach(function() {
        this.sinon.stub(ns.router, 'generateUrl', function() {
            return '/path/page?foo=bar&bar=foo';
        });
    });

    it('должен вызвать ns.router.generateUrl', function() {
        yr.run('main', {}, 'generate-url');
        expect(ns.router.generateUrl).to.be.calledOnce;
    });

    it('должен вернуть scalar', function() {
        var res = yr.run('main', {}, 'generate-url');
        expect(res).to.have.string('/path/page?foo=bar&amp;bar=foo');
    });

});
