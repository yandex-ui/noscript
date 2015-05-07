describe('ns.page.history', function() {

    describe('.push', function() {

        it('не должен записать историю при первом переходе', function() {
            ns.page.history.push('/app');
            expect(ns.page.history.getPrevious()).to.be.equal(undefined);
        });

        it('должен записать историю при втором переходе', function() {
            ns.page.history.push('/app1');
            ns.page.history.push('/app2');
            expect(ns.page.history.getPrevious()).to.be.equal('/app1');
        });

        it('должен сделать дедупликацию, если пользователь нажимает браузерную кнопку Back', function() {
            ns.page.history.push('/app1');
            ns.page.history.push('/app2');
            ns.page.history.push('/app3');
            ns.page.history.push('/app4');
            ns.page.history.push('/app3'); // press back button

            expect(ns.page.history.getPrevious()).to.be.equal('/app2');
        });

    });

});
