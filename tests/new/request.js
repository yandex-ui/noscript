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

var empty_result = {
    id: "NO_DATA",
    reason: "Server returned no data"
};

// ----------------------------------------------------------------------------------------------------------------- //

module("Basic functionality");

test("Creation", function() {
    raises(function() { no.request(); }, /length/, "При создании no.Request необходимо указывать items");
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
    var key = no.Request.getKey(item.key);
    request.promise()
        .then(then)
        .else_(else_);

    // Сервер отвечает сразу на все запросы. До вызова respond весит один запрос.
    // После вызова respond - все последующие запросы будут сразу получать ответы. XXX: как заставить сервер ответить только на один запрос - я не нашёл.
    server.respond();
    // Здесь уже будут выполнены все 3 запроса.

    // TESTS

    is(then.callCount, 1, "Вызывается один раз then с объектом, который создаётся при ошибочном ответе");
    isTrue(then.calledWith([ empty_result ]), "В результате хэндлеры будут вызваны с пустым объектом"); // NOTE мне не нравится, что тут массив.
    is(else_.callCount, 0, "Else не вызывается, потому запрос, который ничего не получил считается всё равно выполненным");
    is(key.retries, 3, "Количество выполненных запросов данных");
    is(key.requestCount, 0, "Число запросов, ожидающих данный запрос: все должны были получить результат");
});

// ----------------------------------------------------------------------------------------------------------------- //

module("Группировка");
var createItem = function(ar) { return { model_id: ar[0], params: ar[1] } };
var testGrouping = function(message, g /* items */) {
    var items = $.map(Array.prototype.slice.call(arguments, 2), createItem);
    var groups = no.Request.items2groups(items);
    deepEqual(groups, g, message);
};
