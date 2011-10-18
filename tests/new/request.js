// For jshint.
/*global no: true, module: true, test: true, ok: true, raises: true */

include('../../src/no/no.js');
include('../../src/no/no.promise.js');
include('../../src/no/no.js');
include('../../src/no/no.object.js');
include('../../src/no/no.http.js');
include('../../src/no/no.promise.js');
include('../../src/no/no.model.js');

include('../../../model/photo.js');
include('../../../model/profile.js');

include('../../src/no/no.request.js');

// ----------------------------------------------------------------------------------------------------------------- //
// Test shortcuts.

var is = equal;
var isNull = function(value, message) { strictEqual(value, null, message); };
var notNull = function(value, message) { notEqual(value, null, message); };
var isTrue = function(value, message) { strictEqual(value, true, message); };

// ----------------------------------------------------------------------------------------------------------------- //
// Test data.

var getTestPhotoModel = function() {
    return {
        model_id: "photo",
        params: {
            'author-id': 22805354,
            'author-login': "chestozo",
            'image-id': 1,
            'only-public': true,

            force: true
        }
    };
};

var getTestProfileModel = function() {
    return {
        model_id: "profile",
        params: {
            'author-id': 22805354,
            'author-login': "chestozo",

            force: true
        }
    };
};

// ----------------------------------------------------------------------------------------------------------------- //

module("Basic functionality");

test("Creation", function() {
    // Empty constructor.
    raises(function() { no.request(); }, /length/, "User must specify items");
});

// ----------------------------------------------------------------------------------------------------------------- //
test("Simple request", function() {
    var server = sinon.fakeServer.create();
    server.respondWith(
        "GET",
        /\/models\/\?model=photo&/,
        '{ "0": { "photo": { "data": "fake" } } }'
    );

    var callback = sinon.spy();
    var then = sinon.spy();
    var else_ = sinon.spy();

    var items = [ getTestPhotoModel() ];
    var request = no.request(items, callback);
    request.promise()
        .then(then)
        .else_(else_);

    ok(request, "Request created");
    is(callback.callCount, 0, "Callback not called");

    // Send request.
    request.request();
    server.respond();

    // Check callbacks.
    var data = [{ data: "fake" }]; // Все хэндлеры вызываются всегда с массивом. NOTE: не очень-то удобно, придётся всегда обращаться к первому элементу?
    is(callback.callCount, 1, "Callback called");
    isTrue(callback.calledWith(data));
    is(then.callCount, 1, "Then callback called");
    isTrue(then.calledWith(data));
    is(else_.callCount, 0, "Else callback called");

    server.restore();
});

// ----------------------------------------------------------------------------------------------------------------- //
test("Retries", function() {
    var clock = sinon.useFakeTimers();
    var server = sinon.fakeServer.create();
    server.respondWith(
        //"GET",
        ///\/models\/\?model=profile&/,
        [403, {}, ""]
    );

    var then = sinon.spy();
    var else_ = sinon.spy();

    var items = [ getTestProfileModel() ];
    var item = items[0];
    var request = no.request(items);
    request.promise()
        .then(then)
        .else_(else_);
    var key = no.Request.getKey(item.key);

    // Send request.
    server.respond();

    // Check callbacks.
    is(then.callCount, 0, "Then callback calls"); // XXX почему-то вызывается then, но может это и правильно.
    is(else_.callCount, 1, "Else callback calls"); // XXX кажется, имеено else должен вызываться
    is(key.retries, 3, "The number of retries, done");
    is(key.requestCount, 1, "The number of requests, waiting for this key");
});

// ----------------------------------------------------------------------------------------------------------------- //

// Params grouping
// id=1, id=1
// id=1, name=1
// id=1, id=2
