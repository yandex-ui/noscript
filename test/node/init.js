// Testing utilities
var expect = require('karma-sinon-chai/node_modules/chai').expect;
var noscript = require('../../');
noscript(); // warm up

describe.only('init', function() {
    it('should init [simple]', function() {
        var ns = noscript();
        ns.View.define('app');
        ns.layout.define('layout', { app: true });
        ns.View.create('app');
        expect(ns).to.be.ok;
    });

    it('should init [events]', function() {
        var ns = noscript();
        ns.View.define('app',{events:{'onclick':null}});
        ns.layout.define('layout', { app: true });
        ns.View.create('app');
        expect(ns).to.be.ok;
    });
});
