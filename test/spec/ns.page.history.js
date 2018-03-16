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

    describe('.replace', function() {

        beforeEach(function() {
            this.url1 = '#url1';
            this.url2 = '#url2';
            this.url3 = '#url3';
            this.url4 = '#url4';
        });

        it('пустая история - меняется только текущий урл', function() {
            this.sinon.stub(ns.page.history, '_current', this.url1);
            this.sinon.stub(ns.page.history, '_history', []);

            ns.page.history.replace(this.url2);

            expect(ns.page.history._current).to.be.equal(this.url2);
            expect(ns.page.history._history).to.be.eql([]);
        });

        it('в истории 1 урл - меняется только текущий урл', function() {
            this.sinon.stub(ns.page.history, '_current', this.url2);
            this.sinon.stub(ns.page.history, '_history', [
                this.url1
            ]);

            ns.page.history.replace(this.url3);

            expect(ns.page.history._current).to.be.equal(this.url3);
            expect(ns.page.history._history).to.be.eql([
                this.url1
            ]);
        });

        it('в истории 2 урла - меняется только текущий урл', function() {
            this.sinon.stub(ns.page.history, '_current', this.url3);
            this.sinon.stub(ns.page.history, '_history', [
                this.url1,
                this.url2
            ]);

            ns.page.history.replace(this.url4);

            expect(ns.page.history._current).to.be.equal(this.url4);
            expect(ns.page.history._history).to.be.eql([
                this.url1,
                this.url2
            ]);
        });

        it('в истории 1 урл - исключаем 2 одинаковых урла после изменения истории = получаем пустую историю', function() {
            this.sinon.stub(ns.page.history, '_current', this.url2);
            this.sinon.stub(ns.page.history, '_history', [
                this.url1
            ]);

            ns.page.history.replace(this.url1);

            expect(ns.page.history._current).to.be.equal(this.url1);
            expect(ns.page.history._history).to.be.eql([]);
        });

        it('в истории 2 урла - исключаем 2 одинаковых урла после изменения истории', function() {
            this.sinon.stub(ns.page.history, '_current', this.url3);
            this.sinon.stub(ns.page.history, '_history', [
                this.url1,
                this.url2
            ]);

            ns.page.history.replace(this.url2);

            expect(ns.page.history._current).to.be.equal(this.url2);
            expect(ns.page.history._history).to.be.eql([
                this.url1
            ]);
        });

    });

});
