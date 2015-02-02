// Testing utilities
var expect = require('karma-sinon-chai/node_modules/chai').expect;
var sinon = require('karma-sinon-chai/node_modules/sinon');
var nock = require('nock');
var jsdom = require('jsdom');

// Templating engine
var yr = require('../../node_modules/yate/lib/runtime.js');

require('../tests.yate.js');

yr.externals = yr.externals || {};
yr.externals.rand = function() {
    return Math.random();
};

// Framework
var ns = require('../../')();

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

    this.createDocument = function(html) {
        return jsdom.jsdom(html, {features: {QuerySelector: true}});
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
                'vAsync2&': true,
                'vCollection': true
            }
        });

        ns.Model.define('mSync1'); ns.Model.define('mSync2'); ns.Model.define('mSync3');
        ns.Model.define('mAsync1'); ns.Model.define('mAsync2');

        ns.Model.define('mItem', {params: {id: null}});
        ns.Model.define('mCollection', {
            split: {
                items: '.items',
                model_id: 'mItem',
                params: {
                    id: '.id'
                }
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

        ns.View.define('vItem', {models: ['mItem']});
        ns.ViewCollection.define('vCollection', {
            models: ['mCollection'],
            split: {
                byModel: 'mCollection',
                intoViews: 'vItem'
            }
        });

        this.response0 = JSON.stringify({
            "models": [
                {"data": {"sync1": true}},
                {"data": {"sync2": true}},
                {"data": {"sync3": true}},
                {"data": {"items": [{id: 1}, {id: 2}, {id: 3}]}}
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

            this.nockScope = nock(appRoot).post(modelsPath + '?_m=mSync1,mSync2,mSync3,mCollection').reply(
                200, this.response0, {"Content-Type": "application/json"}
            );

            this.update = new ns.Update(this.view, ns.layout.page('asyncLayout', {}), {});
            this.update.generateHTML()
                .then(function(html) {
                    this.document = this.createDocument(html);
                    done();
                }, this);
        });

        it('should make correct requests', function() {
            this.nockScope.done();
        });

        it('should create correctly nested nodes of simple sync views', function() {
            var vSync0node = this.document.querySelector('.ns-view-vSync0');

            expect(vSync0node).to.be.ok;
            expect(vSync0node.querySelector('.ns-view-vSync1')).to.be.ok;
            expect(vSync0node.querySelector('.ns-view-vSync2')).to.be.ok;
        });

        it('should create correctly nested nodes of sync viewCollection and items', function() {
            var vCollection = this.document.querySelector('.ns-view-vCollection');
            expect(vCollection).to.be.ok;
            expect(vCollection.querySelectorAll('.ns-view-vItem').length).to.equal(3);
        });

        it('should create nodes of async views', function() {
            expect(this.document.querySelector('.ns-view-vAsync1')).to.be.ok;
            expect(this.document.querySelector('.ns-view-vAsync2')).to.be.ok;
        });

        it('should turn nodes of async views into async mode', function() {
            expect(this.document.querySelector('.ns-view-vAsync1.ns-async')).to.be.ok;
            expect(this.document.querySelector('.ns-view-vAsync2.ns-async')).to.be.ok;
        });

        it('should not create nodes of async views descendants', function() {
            expect(this.document.querySelector('.ns-view-vSync3')).not.to.be.ok;
            expect(this.document.querySelector('.ns-view-vSync4')).not.to.be.ok;
        });
    });

});
