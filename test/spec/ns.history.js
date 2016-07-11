describe('ns.history', function() {

    describe('#_onAnchorClick', function() {

        beforeEach(function() {
            this.sinon.stub(ns.history, 'followAnchorHref');
            this.sinon.stub(ns.router, 'baseDir', '/my/');

            this.event = {
                currentTarget: document.createElement('a')
            };
        });

        it('должен перейти по ссылке, если baseDir совпадает частично', function() {
            this.event.currentTarget.href = '/my/page1';

            ns.history._onAnchorClick(this.event);
            expect(ns.history.followAnchorHref).to.be.calledWith('/my/page1');
        });

        it('должен перейти по ссылке, если baseDir совпадает полностью', function() {
            this.event.currentTarget.href = '/my/';

            ns.history._onAnchorClick(this.event);
            expect(ns.history.followAnchorHref).to.be.calledWith('/my/');
        });

        it('не должен перейти по ссылке, если baseDir не совпадает совсем', function() {
            this.event.currentTarget.href = '/another/page1';

            ns.history._onAnchorClick(this.event);
            expect(ns.history.followAnchorHref).to.have.callCount(0);
        });

        it('не должен перейти по ссылке, если baseDir не совпадает частично', function() {
            this.event.currentTarget.href = '/my';

            ns.history._onAnchorClick(this.event);
            expect(ns.history.followAnchorHref).to.have.callCount(0);
        });

        it('не должен перейти по ссылке, если baseDir совпадает, но задан атрибут target', function() {
            this.event.currentTarget.target = '_self';

            ns.history._onAnchorClick(this.event);
            expect(ns.history.followAnchorHref).to.have.callCount(0);
        });

        it('не должен перейти по ссылке, если href=javascript:void(0)', function() {
            this.event.currentTarget.href = 'javascript:void(0)';

            ns.history._onAnchorClick(this.event);
            expect(ns.history.followAnchorHref).to.have.callCount(0);
        });
    });

});
