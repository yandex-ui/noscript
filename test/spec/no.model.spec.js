describe('no.Model', function() {

    describe('events', function() {

        beforeEach(function() {
            no.Model.define('defined-events-1');

            this.changedCb = sinon.spy();
            this.changedJpathCb = sinon.spy();

            this.eventsDeclaration = {
                'changed': this.changedCb,
                'changed..jpath': this.changedJpathCb
            };

            no.Model.define('defined-events-2', {
                events: this.eventsDeclaration
            });
        });

        afterEach(function() {
            delete this.eventsDeclaration;
            delete this.changedCb;
            delete this.changedJpathCb;

            no.Model.undefine('defined-events-1');
            no.Model.undefine('defined-events-2');
        });

        describe('define', function() {
            it('should create empty object if events is not defined', function() {
                var info = no.Model.info('defined-events-1');
                expect(info.events).to.be.eql({});
            });

            it('should save events if it is defined', function() {
                var info = no.Model.info('defined-events-2');
                expect(info.events).to.be(this.eventsDeclaration);
            });
        });

        describe('trigger', function() {

        });

    });

});
