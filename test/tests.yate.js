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
    var xml2scalar = yr.xml2scalar;
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
        return m.s(j3, c0);
    };
    M.k0.ut = 'scalar';
    M.k0.bt = 'nodeset';



    var j4 = [ ];

    var j5 = [ 0, 'views', 0, '*' ];

    var j6 = [ 0, 'tree', 0, '*' ];

    var j7 = [ 0, 'key' ];

    var j8 = [ 0, 'is_models_valid' ];

    var j9 = [ 0, 'async' ];

    var j10 = [ 0, 'placeholder' ];

    var j11 = [ 0, 'collection' ];

    var j12 = [ 0, 'views', 0, '*' ];

    // match /
    M.t0 = function t0(m, c0, i0, l0, a0) {
        var r0 = '';

        r0 += closeAttrs(a0);
        r0 += "<div";
        a0.a = {
            'class': new yr.scalarAttr("ns-root")
        };
        a0.s = 'div';
        r0 += m.a(m, m.s(j5, c0), 'ns-view', a0)
        r0 += closeAttrs(a0);
        r0 += "</div>";

        return r0;
    };
    M.t0.j = 1;
    M.t0.a = 1;

    // match .* : ns-view
    M.t1 = function t1(m, c0, i0, l0, a0) {
        var r0 = '';

        r0 += m.a(m, m.n(j6, yr.document(m.s(j3, c0))), 'ns-build-view', a0)

        return r0;
    };
    M.t1.j = j2;
    M.t1.a = 0;

    // match .* : ns-build-view
    M.t2 = function t2(m, c0, i0, l0, a0) {
        var r0 = '';

        r0 += closeAttrs(a0);
        r0 += "<div";
        a0.a = {
            'class': new yr.scalarAttr("ns-view-" + ( c0.name )),
            'data-key': new yr.scalarAttr(nodeset2scalar( ( selectNametest('key', c0.doc.root, []) ) ))
        };
        a0.s = 'div';
        if (simpleBoolean('placeholder', c0.doc.root)) {
            var tmp0 = a0.a[ "class" ];
            if (tmp0) {
                a0.a[ "class" ] = tmp0.addscalar(" ns-view-placeholder");
            } else {
                a0.a[ "class" ] = new yr.scalarAttr(" ns-view-placeholder");
            }
            r0 += m.a(m, m.s(j3, c0), 'ns-view-desc', a0)
        } else {
            var r1 = '';
            var a1 = { a: {} };
            r1 += m.a(m, m.s(j3, c0), 'ns-view-add-class', a1)
            var tmp0 = a0.a[ "class" ];
            if (tmp0) {
                a0.a[ "class" ] = tmp0.addxml(r1);
            } else {
                a0.a[ "class" ] = new yr.xmlAttr(r1);
            }
            r0 += m.a(m, m.s(j3, c0), 'ns-view-add-attrs', a0)
            if (simpleBoolean('async', c0.doc.root)) {
                r0 += m.a(m, m.s(j3, c0), 'ns-view-async-content', a0)
            } else {
                if (( selectNametest('is_models_valid', c0.doc.root, []) ).length && !simpleBoolean('is_models_valid', c0.doc.root)) {
                    r0 += m.a(m, m.s(j3, c0), 'ns-view-error-content', a0)
                } else {
                    r0 += m.a(m, m.s(j3, c0), 'ns-view-content', a0)
                }
            }
        }
        r0 += closeAttrs(a0);
        r0 += "</div>";

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

    // match .* : ns-view-add-attrs
    M.t4 = function t4(m, c0, i0, l0, a0) {
        var r0 = '';

        return r0;
    };
    M.t4.j = j2;
    M.t4.a = 0;

    // match .* : ns-view-content
    M.t5 = function t5(m, c0, i0, l0, a0) {
        var r0 = '';

        if (nodeset2boolean( (selectNametest('collection', c0.doc.root, [])) )) {
            r0 += closeAttrs(a0);
            r0 += "<div";
            a0.a = {
                'class': new yr.scalarAttr("ns-view-container-desc")
            };
            a0.s = 'div';
            r0 += m.a(m, m.s(j3, c0), 'ns-view-desc', a0)
            r0 += closeAttrs(a0);
            r0 += "</div>";
        } else {
            r0 += m.a(m, m.s(j3, c0), 'ns-view-desc', a0)
        }

        return r0;
    };
    M.t5.j = j2;
    M.t5.a = 0;

    // match .* : ns-view-desc
    M.t6 = function t6(m, c0, i0, l0, a0) {
        var r0 = '';

        r0 += m.a(m, m.s(j12, c0.doc.root), 'ns-view', a0)

        return r0;
    };
    M.t6.j = j2;
    M.t6.a = 0;

    // match .* : ns-view-async-content
    M.t7 = function t7(m, c0, i0, l0, a0) {
        var r0 = '';

        r0 += closeAttrs(a0);
        r0 += "async-view-content";

        return r0;
    };
    M.t7.j = j2;
    M.t7.a = 0;

    // match .* : ns-view-error-content
    M.t8 = function t8(m, c0, i0, l0, a0) {
        var r0 = '';

        r0 += closeAttrs(a0);
        r0 += "view-error-content";

        return r0;
    };
    M.t8.j = j2;
    M.t8.a = 0;

    // match .* : ns-view-add-attrs
    M.t9 = function t9(m, c0, i0, l0, a0) {
        var r0 = '';

        a0.a[ "data-random" ] = new yr.scalarAttr(( (yr.externals['rand'])() ));

        return r0;
    };
    M.t9.j = j2;
    M.t9.a = 0;

    // match .* : ns-view-desc
    M.t10 = function t10(m, c0, i0, l0, a0) {
        var r0 = '';

        a0.a[ "data-random" ] = new yr.scalarAttr(( (yr.externals['rand'])() ));
        r0 += m.a(m, m.s(j12, c0.doc.root), 'ns-view', a0)

        return r0;
    };
    M.t10.j = j2;
    M.t10.a = 0;

    // match .* : ns-view-async-content
    M.t11 = function t11(m, c0, i0, l0, a0) {
        var r0 = '';

        var tmp0 = a0.a[ "class" ];
        if (tmp0) {
            a0.a[ "class" ] = tmp0.addscalar(" ns-async");
        } else {
            a0.a[ "class" ] = new yr.scalarAttr(" ns-async");
        }
        r0 += closeAttrs(a0);
        r0 += "async-view-content";

        return r0;
    };
    M.t11.j = j2;
    M.t11.a = 0;

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
        "ns-view-add-attrs": {
            "*": [
                "t9",
                "t4"
            ]
        },
        "ns-view-content": {
            "*": [
                "t5"
            ]
        },
        "ns-view-desc": {
            "*": [
                "t10",
                "t6"
            ]
        },
        "ns-view-async-content": {
            "*": [
                "t11",
                "t7"
            ]
        },
        "ns-view-error-content": {
            "*": [
                "t8"
            ]
        }
    };
    M.imports = [];

    yr.register('main', M);

})();
