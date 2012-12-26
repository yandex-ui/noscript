describe('no.Model', function() {

    describe('events', function() {

        beforeEach(function() {
            no.Model.define('defined-events-1');

            this.changedCb = sinon.spy();
            this.changedJpathCb = sinon.spy();

            this.eventsDeclaration = {
                'changed': this.changedCb,
                'changed..data': this.changedJpathCb
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

            beforeEach(function() {
                this.model = no.Model.create('defined-events-2');
                this.model.setData({data: 1});
            });

            afterEach(function() {
                delete this.model;
            });

            it('should call callback on .setData()', function() {
                expect(this.changedCb.calledOnce).to.be.ok();
            });

            it('should call callback on .setData() with "model" as this', function() {
                expect(this.changedCb.calledOn(this.model)).to.be.ok();
            });

            it('should call callback on .set()', function() {
                this.model.set('.data', 2);
                expect(this.changedJpathCb.calledOnce).to.be.ok();
            });

            it('should call callback on .set() with "model" as this', function() {
                this.model.set('.data', 2);
                expect(this.changedJpathCb.calledOn(this.model)).to.be.ok();
            });

            it('should call callback on .set() with params', function() {
                this.model.set('.data', 2);
                expect(this.changedJpathCb.calledWith('changed..data', {
                    'old': 1,
                    'new': 2,
                    'jpath': '.data'
                })).to.be.ok();
            });
        });

    });

});
