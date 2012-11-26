describe('no.View', function() {

    describe('no.View.define', function() {

        beforeEach(function() {
            sinon.spy(no.View, 'define');
        });

        afterEach(function() {
            no.View.define.restore();
        });

        it('should throw exception if I define View twice', function() {
            no.View.define('test-view-define-twice');
            try {
                no.View.define('test-view-define-twice');
            } catch(e) {}

            expect(no.View.define.getCall(1).threw()).to.be.ok();
        });
    });

});
