// Testing utilities
var expect = require('../../node_modules/karma-sinon-chai/node_modules/chai/lib/chai.js').expect;
var sinon = require('../../node_modules/karma-sinon-chai/node_modules/sinon/lib/sinon.js');
var nock = require('nock');
var env = require('jsdom').env;

// Templating engine
var yr = require('../../node_modules/yate/lib/runtime.js');

require('../tests.yate.js');

yr.externals = yr.externals || {};
yr.externals.rand = function() {
    return Math.random();
};

// Framework
var ns = require('../../dist/noscript.module.js');

// Connection between framework and templating engine
ns.renderString = function(json, mode, module) {
    return yr.run(module || 'main', json, mode);
};

// Fake host
var appRoot = 'http://usa.gov';
var modelsPath = '/models';
ns.request.URL = appRoot + modelsPath;

beforeEach(function() {
    this.sinon = sinon.sandbox.create();

    this.sinon.spy(ns, 'renderString');
    this.sinon.spy(ns, 'renderNode');

    this.execInDom = function(html, func) {
        env(html, function (errors, window) {
            if (errors) {
                throw errors;
            }

            func.call(this, window, require('jquery')(window));
        }.bind(this));
    };
});

afterEach(function() {
    this.sinon.restore();
    ns.reset();
});

describe('app rendering in node.js', function() {
	beforeEach(function() {
		ns.layout.define('asyncLayout', {
            'app': {
                'vSync0':   ['vSync1', 'vSync2'],
                'vAsync1&': ['vSync3', 'vSync4'],
                'vAsync2&': true
            }
        });

        ns.View.define('app');
        this.view = ns.View.create('app');

        ns.View.define('vSync0', {models: ['mSync1']});
        ns.View.define('vSync1');
        ns.View.define('vSync2', {models: ['mSync2']});
        ns.View.define('vSync3', {models: ['mSync3']});
        ns.View.define('vSync4');

        ns.View.define('vAsync1', {models: ['mAsync1']});
        ns.View.define('vAsync2', {models: ['mAsync2']});

        ns.Model.define('mSync1'); ns.Model.define('mSync2'); ns.Model.define('mSync3');
        ns.Model.define('mAsync1'); ns.Model.define('mAsync2');

        this.response0 = JSON.stringify({
            "models": [
                {"data": {"sync1": true}},
                {"data": {"sync2": true}},
                {"data": {"sync3": true}}
            ]
        });

        this.response1 = JSON.stringify({
            "models": [
                {"data": {"async1": true}}
            ]
        });

        this.response2 = JSON.stringify({
            "models": [
                {"data": {"async2": true}}
            ]
        });
	});

	describe('generateHTML', function() {
        beforeEach(function(done) {

            this.nockScope = nock(appRoot).post(modelsPath + '?_m=mSync1,mSync2,mSync3').reply(
                200, this.response0, {"Content-Type": "application/json"}
            );

            this.update = new ns.Update(this.view, ns.layout.page('asyncLayout', {}), {});
            this.update.generateHTML()
                .then(function(html) {
                    this.html = html;
                    done();
                }, this);
        });

        it('should make correct requests', function() {
            this.nockScope.done();
        });

        it('should create correctly nested nodes of sync views', function() {
            this.execInDom(this.html, function (window, $) {
                var vSync0node = $('.ns-view-vSync0');

                expect(vSync0node.length).to.equal(1);
                expect(vSync0node.find('.ns-view-vSync1').length).to.equal(1);
                expect(vSync0node.find('.ns-view-vSync2').length).to.equal(1);
            });
        });

        it('should create nodes of async views', function() {
            this.execInDom(this.html, function (window, $) {
                expect($('.ns-view-vAsync1').length).to.equal(1);
                expect($('.ns-view-vAsync2').length).to.equal(1);
            });
        });

        it('should turn nodes of async views into async mode', function() {
            this.execInDom(this.html, function (window, $) {
                expect($('.ns-view-vAsync1.ns-async').length).to.equal(1);
                expect($('.ns-view-vAsync2.ns-async').length).to.equal(1);
            });
        });

        it('should not create nodes of async views descendants', function() {
            this.execInDom(this.html, function (window, $) {
                expect($('.ns-view-vAsync3').length).to.equal(0);
                expect($('.ns-view-vAsync3').length).to.equal(0);
            });
        });
    });

});
