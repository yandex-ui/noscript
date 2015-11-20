// Testing utilities
var expect = require('chai').expect;
var noscript = require('../../');
noscript(); // warm up

describe('init', function() {
    it('should init [simple]', function() {
        var ns = noscript();
        ns.View.define('app');
        ns.layout.define('layout', { app: true });
        ns.View.create('app');
        expect(ns).to.be.ok;
    });

    it('should init [events]', function() {
        var ns = noscript();
        ns.View.define('app',{events:{'onclick':function(){}, 'custom-event':function(){}}});
        ns.layout.define('layout', { app: true });
        ns.View.create('app');
        expect(ns).to.be.ok;
    });
});
