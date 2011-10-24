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

var getPhotoItem = function() {
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

var getProfileItem = function() {
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
        /^\/models\/.*_models\.0=photo.*$/,
        [ 200, {}, '{ "0": { "photo": { "data": "fake" } } }' ]
    );

    var callback = sinon.spy();
    var then = sinon.spy();
    var else_ = sinon.spy();

    var items = [ getPhotoItem() ];
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
    var server = sinon.fakeServer.create();
    server.respondWith(
        [ 403, {}, "" ]
    );

    var then = sinon.spy();
    var else_ = sinon.spy();

    var item = getProfileItem();
    var request = no.request([ item ]);
    request.promise()
        .then(then)
        .else_(else_);
    var key = no.Request.getKey(item.key);

    // Send request.
    server.respond();

    // Check callbacks.
    is(then.callCount, 1, "Вызывается один раз then с объектом, который создаётся при ошибочном ответе");

    var empty_result = {
        id: "NO_DATA",
        reason: "Server returned no data"
    };
    isTrue(then.calledWith([ empty_result ]), "В результате хэндлеры будут вызваны с пустым объектом");

    is(else_.callCount, 0, "Else не вызывается, потому запрос, который ничего не получил считается всё равно выполненным");
    is(key.retries, 3, "Количество выполненных запросов данных");
    is(key.requestCount, 1, "Число запросов, ожидающих данный запрос");
});

// ----------------------------------------------------------------------------------------------------------------- //

module("Группировка");
var createItem = function(ar) { return { model_id: ar[0], params: ar[1] } };
var testGrouping = function(message, g /* items */) {
    var items = $.map(Array.prototype.slice.call(arguments, 2), createItem);
    var groups = no.Request.items2groups(items);
    deepEqual(groups, g, message);
};

// ----------------------------------------------------------------------------------------------------------------- //
test("Группировка неконфликтующих параметров", function() {

    testGrouping(
        "Одинаковое количество параметров с одинаковыми значениями",
        [ { model_ids: [ "photo", "profile" ], params: { id: 1 } } ],
        [ "photo", { id: 1 } ],
        [ "profile", { id: 1 } ]
    );

    testGrouping(
        "Разный набор параметров, те, что пересекаются, - одинаковые",
        [ { model_ids: [ "photo", "profile" ], params: { id: 1, login: "che" } } ],
        [ "photo", { id: 1 } ],
        [ "profile", { id: 1, login: "che" } ]
    );

    // XXX здесь, кажется, должна быть только одна группа.
    testGrouping(
        "Запрос одной и той же модели дважды",
        [ { model_ids: [ "photo" ], params: { id: 1 } } ],
        [ "photo", { id: 1 } ],
        [ "photo", { id: 1 } ]
    );
});

// ----------------------------------------------------------------------------------------------------------------- //
test("Группировка конфликтующих параметров", function() {
    testGrouping(
        "Запрос двух моделей с разными значениями переодного и того же параметра",
        [
            { model_ids: [ "photo" ], params: { id: 1 } },
            { model_ids: [ "profile" ], params: { id: 2 } }
        ],
        [ "photo", { id: 1 } ],
        [ "profile", { id: 2 } ]
    );

    testGrouping(
        "Запрос двух моделей с разными значениями переодного и того же параметра",
        [
            { model_ids: [ "photo" ], params: { id: 1, login: "nop" } },
            { model_ids: [ "profile" ], params: { id: 1, login: "mmoo" } }
        ],
        [ "photo", { id: 1, login: "nop" } ],
        [ "profile", { id: 1, login: "mmoo" } ]
    );

    // NOTE к сожалению, группировка только последовательная.
    testGrouping(
        "Не группируются те элементы, что идут непоследовательно",
        [
            { model_ids: [ "photo" ], params: { id: 1 } },
            { model_ids: [ "profile" ], params: { id: 2 } },
            { model_ids: [ "album" ], params: { id: 1 } }
        ],
        [ "photo", { id: 1 } ],
        [ "profile", { id: 2 } ],
        [ "album", { id: 1 } ]
    );

    // XXX почему-то группа получается без параметров
    testGrouping(
        "Не группируются те элементы, что идут непоследовательно",
        [
            { model_ids: [ "photo", "album" ], params: { id: 1, login: "nop" } }
        ],
        [ "photo", { id: 1, login: "nop" } ],
        [ "album", {} ]
    );
});
