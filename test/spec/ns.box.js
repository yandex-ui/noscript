describe('ns.Box', function() {

    beforeEach(function() {
        ns.layout.define('app', {
            'app': {
                'content@': true
            }
        });

        ns.layout.define('content1', {
            'app content@': {
                'content1': {}
            }
        }, 'app');

        ns.layout.define('content2', {
            'app content@': {
                'content2': {}
            }
        }, 'app');

        ns.layout.define('content3', {
            'app content@': {
                'content3&': {}
            }
        }, 'app');

        ns.View.define('app');
        ns.View.define('content1', {
            params: {
                p: null
            }
        });
        ns.View.define('content2');
        ns.View.define('content3', {
            models: ['model3']
        });

        ns.Model.define('model3');

        this.xhr = sinon.useFakeXMLHttpRequest();
        var requests = this.requests = [];
        this.xhr.onCreate = function (xhr) {
            requests.push(xhr);
        };

        /**
         * @type {ns.View}
         */
        this.APP = ns.View.create('app');
    });

    afterEach(function() {
        this.xhr.restore();

        delete this.APP;
        delete this.xhr;
    });

    describe('view select', function() {

        describe('regular view', function() {

            beforeEach(function() {
                var layout = ns.layout.page('content2', {});
                new ns.Update(this.APP, layout, {}).start();
            });

            it('should have node for "content2"', function() {
                expect($(this.APP.node).find('.ns-view-content2')).to.have.length(1);
            });

            it('should have visible node for "content2" ', function() {
                expect($(this.APP.node).find('.ns-view-content2').hasClass('ns-view-visible')).to.be.ok();
            });

        });

        describe('async view', function() {

            beforeEach(function() {
                var layout = ns.layout.page('content3', {});
                new ns.Update(this.APP, layout, {}).start();
            });

            it('should have node for "content3"', function() {
                expect($(this.APP.node).find('.ns-view-content3')).to.have.length(1);
            });

            it('should have visible node for "content2" ', function() {
                //TODO: i'm not sure that this is valid test
                expect($(this.APP.node).find('.ns-view-content3').hasClass('ns-view-visible')).to.not.be.ok();
            });

        });

    });

    describe('view change', function() {

        describe('"content2" -> "content1"', function() {

            beforeEach(function() {
                new ns.Update(
                    this.APP,
                    ns.layout.page('content2', {}),
                    {}
                ).start();

                var page2Params = {p: 1};
                new ns.Update(
                    this.APP,
                    ns.layout.page('content1', page2Params),
                    page2Params
                ).start();
            });

            it('should have node for "content1" ', function() {
                expect($(this.APP.node).find('.ns-view-content1')).to.have.length(1);
            });

            it('should have visible node for "content1" ', function() {
                expect($(this.APP.node).find('.ns-view-content1').hasClass('ns-view-visible')).to.be.ok();
            });

            it('should have node for "content2" ', function() {
                expect($(this.APP.node).find('.ns-view-content2')).to.have.length(1);
            });

            it('should have hidden node for "content2" ', function() {
                expect($(this.APP.node).find('.ns-view-content2').hasClass('ns-view-hidden')).to.be.ok();
            });

        });

        describe('"content1"(p=1) -> "content1"(p=2)', function() {

            beforeEach(function() {
                var page1Params = {p: 1};
                new ns.Update(
                    this.APP,
                    ns.layout.page('content1', page1Params),
                    page1Params
                ).start();

                var page2Params = {p: 2};
                new ns.Update(
                    this.APP,
                    ns.layout.page('content1', page2Params),
                    page2Params
                ).start();
            });

            it('should have two nodes for "content1" ', function() {
                expect($(this.APP.node).find('.ns-view-content1')).to.have.length(2);
            });

            it('should have first hidden node for "content1" ', function() {
                expect($(this.APP.node).find('.ns-view-content1:eq(0)').hasClass('ns-view-hidden')).to.be.ok();
            });

            it('should have second visible node for "content1" ', function() {
                expect($(this.APP.node).find('.ns-view-content1:eq(1)').hasClass('ns-view-visible')).to.be.ok();
            });

        });
    });

});
