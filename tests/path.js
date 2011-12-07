include('../src/no/no.js');
include('../src/no/no.path.js');

// ----------------------------------------------------------------------------------------------------------------- //
module("Object");

test("Getter: first level", function() {
    var obj = {
        first_undef: undefined,
        first_null: null,
        first_zero: 0,
        first_num: 1,
        first_empty_str: "",
        first_str: "XoXo",
        first_empty_array: [],
        first_array: [ 1, "str" ]
    };

    strictEqual(no.path("does_not_exist", obj), undefined, "Not existent property returns undefined");
    strictEqual(no.path("first_undef", obj), undefined, "Existing property with undefined value");
    strictEqual(no.path("first_null", obj), null, "Existing property with null value");
    strictEqual(no.path("first_zero", obj), 0, "Existing property with value = 0");
    strictEqual(no.path("first_num", obj), 1, "Existing property with value = 1");
    strictEqual(no.path("first_empty_str", obj), "", "Existing property with empty string");
    strictEqual(no.path("first_str", obj), "XoXo", "Existing property with string value");
    deepEqual(no.path("first_empty_array", obj), [], "Existing property with empty array");
    deepEqual(no.path("first_array", obj), [ 1, "str" ], "Existing property with empty array");
});

test("Getter: second level", function() {
    var obj = {
        prop: {
            first_undef: undefined,
            first_null: null,
            first_zero: 0,
            first_num: 1,
            first_empty_str: "",
            first_str: "XoXo",
            first_empty_array: [],
            first_array: [ 1, "str" ]
       }
    };

    strictEqual(no.path("prop.does_not_exist", obj), undefined, "Not existent property returns undefined");
    strictEqual(no.path("prop.first_undef", obj), undefined, "Existing property with undefined value");
    strictEqual(no.path("prop.first_null", obj), null, "Existing property with null value");
    strictEqual(no.path("prop.first_zero", obj), 0, "Existing property with value = 0");
    strictEqual(no.path("prop.first_num", obj), 1, "Existing property with value = 1");
    strictEqual(no.path("prop.first_empty_str", obj), "", "Existing property with empty string");
    strictEqual(no.path("prop.first_str", obj), "XoXo", "Existing property with string value");
    deepEqual(no.path("prop.first_empty_array", obj), [], "Existing property with empty array");
    deepEqual(no.path("prop.first_array", obj), [ 1, "str" ], "Existing property with empty array");
});

test("Setter", function() {
    var obj = {
        foo: {
            bar: [ 0, 1, 2, 3, 4 ]
        }
    };

    deepEqual(no.path("foo.bar", obj, "replacer"), [ 0, 1, 2, 3, 4 ], "Setter must return old value");
    strictEqual(no.path("foo.bar", obj), "replacer", "Setter should have replaced array with string");
});

// ----------------------------------------------------------------------------------------------------------------- //
module("Array");

test("Main operations", function() {
    var obj = {
        foo: {
            bar: [ 0, 1, 2, 3, 4 ]
        }
    };

    deepEqual(no.path('foo.bar', obj), [ 0, 1, 2, 3, 4 ], "Arrar getter");
    strictEqual(no.path('foo.bar[3]', obj), 3, "Array item getter");
    strictEqual(no.path('foo.bar.baz', obj), undefined, "Missing property getter");
});

test("Setter mix", function() {
    var obj = {
        foo: {
            bar: [ 0, 1, 2, 3, 4 ]
        }
    };

    var old = no.path('foo.bar', obj, 42);
    var old2 = no.path('foo.bar[3]', obj, 666);
    strictEqual(no.path('foo.bar', obj), 42, "Property was unchanged");
    strictEqual(no.path('foo.bar[3]', obj), undefined, "Property was not set");
});

test("Change type to array", function() {
    var obj = {
        foo: {
            bar: 666
        }
    };

    no.path("foo.bar", obj, []);
    no.path("foo.bar[3]", obj, 4);
    strictEqual(no.path("foo.bar[3]", obj), 4, "Array item was set correctly");
});
