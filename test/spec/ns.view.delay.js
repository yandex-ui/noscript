describe('Отложенные View', function() {

    beforeEach(function() {

        ns.Model.define('m1');
        ns.Model.define('m2');

        ns.View.define('view-delay', {
            models: {
                'm1': true,
                'm2': 'DELAY'
            }
        });

        ns.Model.get('m1').setData({
            data: 'm1'
        });
        ns.Model.get('m2').setData({
            data: 'm2'
        });

        this.view = ns.View.create('view-delay');
    });

    it('должен отрисовать вид без отложенной модели, даже если она валидна', function() {
        return this.view.update().then(function() {
            expect(this.view.node.innerHTML).to.contain('<div class="m2"></div>');
        }, null, this);
    });

    it('обновление отложенной модели не должно влиять на состояние вида', function() {
        return this.view.update().then(function() {
            ns.Model.get('m2').set('.data', 'm3');
            expect(this.view.status).to.be.equal(ns.V.STATUS.OK);
        }, null, this);
    });

    it('должен перерисовать вид после включения отложенной модели', function() {
        this.view.enableModel('m2');
        return this.view.update()
            .then(function() {
                expect(this.view.node.innerHTML).to.contain('<div class="m2">m2</div>');
            }, null, this);
    });

    it('обновление включенной модели должно влиять на состояние вида', function() {
        this.view.enableModel('m2');
        return this.view.update()
            .then(function() {
                ns.Model.get('m2').set('.data', 'm3');
                expect(this.view.status).to.be.equal(ns.V.STATUS.INVALID);
            }, null, this);
    });

    it('не должен перерисовать вид после отключения отложенной модели, если вид до этого был валиден', function() {
        this.view.enableModel('m2');
        return this.view.update()
            .then(function() {
                this.view.disableModel('m2');
                ns.Model.get('m2').set('.data', 'm3');
                return this.view.update();
            }, null, this)
            .then(function() {
                expect(this.view.node.innerHTML).to.contain('<div class="m2">m2</div>');
            }, null, this);
    });

});
