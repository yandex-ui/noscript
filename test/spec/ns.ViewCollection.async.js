xdescribe('ns.ViewCollection с async-видами', function() {

    beforeEach(function(done) {

        this.asyncSpy = this.sinon.spy();
        this.htmlinitSpy = this.sinon.spy();
        this.showSpy = this.sinon.spy();

        this.sinon.spy(ns, 'Update');

        ns.Model.define('mc', {
            split: {
                items: '/',
                model_id: 'mc-item',
                params: {
                    id: '.id'
                }
            }
        });

        ns.Model.define('mc-item', {
            params: {id: null}
        });

        ns.Model.define('other-model');

        ns.Model.get('mc').setData([
            {item: 1, id: 1},
            {item: 2, id: 2}
        ]);

        ns.ViewCollection.define('vc', {
            models: ['mc'],
            split: {
                byModel: 'mc',
                intoViews: 'vc-item'
            }
        });

        ns.View.define('vc-item', {
            events: {
                'ns-view-init': function() {
                    //FIXME: хак. Делаем вид async
                    this.async = true;
                },
                'ns-view-async': this.asyncSpy,
                'ns-view-htmlinit': this.htmlinitSpy,
                'ns-view-show': this.showSpy
            },
            models: ['mc-item', 'other-model']
        });

        ns.View.define('app', {});

        ns.layout.define('test', {
            'app': {
                'vc': {}
            }
        });

        var view = ns.View.create('app');

        new ns.Update(
            view,
            ns.layout.page('test'),
            {}
        ).render().then(function(value) {
                //FIXME: элементы коллекции не добавляются как async-промисы :(
                window.setTimeout(function() {
                    done();
                }, 100);
            }, function(err) {
                done(err);
            });

    });

    it('должен два раза вызвать ns-view-async', function() {
        expect(this.asyncSpy).to.have.callCount(2);
    });

    it('не должен вызвать ns-view-htmlinit для async', function() {
        expect(this.htmlinitSpy).to.have.callCount(0);
    });

    it('не должен вызвать ns-view-show для async', function() {
        expect(this.showSpy).to.have.callCount(0);
    });

    it('должен запустить два async update', function() {
        expect(ns.Update.getCall(1).args[0].key).to.be.equal("view=vc-item&id=2");
        expect(ns.Update.getCall(2).args[0].key).to.be.equal("view=vc-item&id=1");
    });

});
