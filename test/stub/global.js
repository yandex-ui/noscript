beforeEach(function() {
    this.sinon = sinon.sandbox.create({
        useFakeServer: true
    });

    this.sinon.spy(ns, 'renderString');
    this.sinon.spy(ns, 'renderNode');
    this.sinon.stub(ns.history, 'pushState');
    this.sinon.stub(ns.history, 'replaceState');

    this.sinon.stub(ns.log, 'exception', function(a,b,c) {
        console.error('ns.log.exception', a, b, c);
    });
});

afterEach(function() {
    this.sinon.restore();
    ns.reset();
});

if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
        if (typeof this !== "function") {
            // closest thing possible to the ECMAScript 5 internal IsCallable function
            throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
        }

        var aArgs = Array.prototype.slice.call(arguments, 1),
            fToBind = this,
            fNOP = function () {},
            fBound = function () {
                return fToBind.apply(this instanceof fNOP && oThis
                        ? this
                        : oThis,
                    aArgs.concat(Array.prototype.slice.call(arguments)));
            };

        fNOP.prototype = this.prototype;
        fBound.prototype = new fNOP();

        return fBound;
    };
}
