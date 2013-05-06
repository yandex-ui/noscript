var yr = yr || require('yate/lib/runtime.js');

(function() {

    var cmpNN = yr.cmpNN;
    var cmpSN = yr.cmpSN;
    var nodeset2xml = yr.nodeset2xml;
    var nodeset2boolean = yr.nodeset2boolean;
    var nodeset2attrvalue = yr.nodeset2attrvalue;
    var nodeset2scalar = yr.nodeset2scalar;
    var scalar2attrvalue = yr.scalar2attrvalue;
    var xml2attrvalue = yr.xml2attrvalue;
    var scalar2xml = yr.scalar2xml;
    var simpleScalar = yr.simpleScalar;
    var simpleBoolean = yr.simpleBoolean;
    var selectNametest = yr.selectNametest;
    var closeAttrs = yr.closeAttrs;

    var M = new yr.Module();

    var j0 = [ 0, 'layout-params' ];

    //  var layout-params : nodeset
    M.v0 = function(m, c0, i0, l0) {
        return selectNametest('layout-params', c0.doc.root, []);
    };

    var j1 = [ 0, 'models' ];

    //  var models : nodeset
    M.v1 = function(m, c0, i0, l0) {
        return selectNametest('models', c0.doc.root, []);
    };

    var j2 = [ 0, '*' ];

    var j3 = [ 1, 0 ];

    M.k0 = {};
    M.k0.n = function k0n(m, c0, i0, l0) {
        return m.n(j2, m.v('v1', c0));
    };
    //  scalar
    M.k0.u = function k0u(m, c0, i0, l0) {
        return c0.name;
    };
    //  nodeset
    M.k0.b = function k0b(m, c0, i0, l0, a0) {
        return [ c0 ];
    };
    M.k0.ut = 'scalar';
    M.k0.bt = 'nodeset';

    var j4 = [ ];

    var j5 = [ 0, 'views', 0, '*' ];

    var j6 = [ 0, 'tree', 0, '*' ];

    var j7 = [ 0, 'async' ];

    var j8 = [ 0, 'views', 0, '*' ];

    // match /
    M.t0 = function t0(m, c0, i0, l0, a0) {
        var r0 = '';

        r0 += closeAttrs(a0);
        r0 += '<div';
        a0.a = {
            'class': new yr.scalarAttr("ns-root")
        };
        a0.s = 'div';
        r0 += m.a(m, m.s(j5, c0), 'ns-view', a0);
        r0 += closeAttrs(a0);
        r0 += '</div>';

        return r0;
    };
    M.t0.j = 1;
    M.t0.a = 1;

    // match .* : ns-view
    M.t1 = function t1(m, c0, i0, l0, a0) {
        var r0 = '';

        r0 += m.a(m, m.n(j6, yr.document([ c0 ])), 'ns-build-view', a0);

        return r0;
    };
    M.t1.j = j2;
    M.t1.a = 0;

    // match .* : ns-build-view
    M.t2 = function t2(m, c0, i0, l0, a0) {
        var r0 = '';

        r0 += closeAttrs(a0);
        r0 += '<div';
        a0.a = {
            'class': new yr.scalarAttr("ns-view-" + ( c0.name ))
        };
        a0.s = 'div';
        var r1 = '';
        var a1 = { a: {} };
        r1 += m.a(m, [ c0 ], 'ns-view-add-class', a1);
        var tmp0 = a0.a[ "class" ];
        if (tmp0) {
            a0.a[ "class" ] = tmp0.addxml(r1);
        } else {
            a0.a[ "class" ] = new yr.xmlAttr(r1);
        }
        if (simpleBoolean('async', c0.doc.root)) {
            r0 += m.a(m, [ c0 ], 'ns-view-async-content', a0);
        } else {
            r0 += m.a(m, [ c0 ], 'ns-view-content', a0);
        }
        r0 += closeAttrs(a0);
        r0 += '</div>';

        return r0;
    };
    M.t2.j = j2;
    M.t2.a = 0;

    // match .* : ns-view-add-class
    M.t3 = function t3(m, c0, i0, l0, a0) {
        var r0 = '';

        return r0;
    };
    M.t3.j = j2;
    M.t3.a = 0;

    // match .* : ns-view-content
    M.t4 = function t4(m, c0, i0, l0, a0) {
        var r0 = '';

        r0 += m.a(m, m.s(j8, c0.doc.root), 'ns-view', a0);

        return r0;
    };
    M.t4.j = j2;
    M.t4.a = 0;

    // match .* : ns-view-async-content
    M.t5 = function t5(m, c0, i0, l0, a0) {
        var r0 = '';

        r0 += closeAttrs(a0);
        r0 += "async-view-content";

        return r0;
    };
    M.t5.j = j2;
    M.t5.a = 0;

    // match .* : ns-view-async-content
    M.t6 = function t6(m, c0, i0, l0, a0) {
        var r0 = '';

        r0 += closeAttrs(a0);
        r0 += '<div class="' + "will-be-replaced" + '">' + "async-view-content" + '</div>';

        return r0;
    };
    M.t6.j = j2;
    M.t6.a = 0;

    M.matcher = {
        "": {
            "": [
                "t0"
            ]
        },
        "ns-view": {
            "*": [
                "t1"
            ]
        },
        "ns-build-view": {
            "*": [
                "t2"
            ]
        },
        "ns-view-add-class": {
            "*": [
                "t3"
            ]
        },
        "ns-view-content": {
            "*": [
                "t4"
            ]
        },
        "ns-view-async-content": {
            "*": [
                "t6",
                "t5"
            ]
        }
    };
    M.imports = [];

    yr.register('main', M);

})();