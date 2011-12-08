include('../src/no/no.js');
include('../src/no/no.object.js');
include('../src/no/no.http.js');
include('../src/no/no.promise.js');
include('../src/no/no.model.js');

include('../../model/photo.js');
include('../../model/profile.js');
include('../../model/comments.js');

include('../src/no/no.request.js');

// ----------------------------------------------------------------------------------------------------------------- //
// Test shortcuts.

var is = equal;
var isNull = function(value, message) { strictEqual(value, null, message); };
var notNull = function(value, message) { notEqual(value, null, message); };
var isTrue = function(value, message) { strictEqual(value, true, message); };

// ----------------------------------------------------------------------------------------------------------------- //

module("Базовые функции");

test("Запрос photo: сервер отвечает no_data", function() {
    var server = sinon.fakeServer.create();
    server.respondWith(
        "GET",
        /^\/models\/.*_models\.0=photo.*$/,
        [ 200, {}, '{ "0": { "photo": { "data": "fake" } } }' ]
    );

    var then = sinon.spy();
    var else_ = sinon.spy();

    var groups = [
        {
            models: [ "photo" ],
            params: {
                'author-id': 22805354,
                'author-login': "chestozo",
                'image-id': 1,
                'only-public': true
            }
        }
    ];

    var request = new no.Request(groups);
    var promise = request.start();
    promise
        .then(then)
        .else_(else_);

    // Сервер до сих пор ждал, а сейчас начинает отвечать. Причём, отвечает он мгновенно.
    server.respond();

    // Проверка, какие колбэки вызывались.
    is(then.callCount, 1, "Then был вызван один раз");
    is(else_.callCount, 0, "Else не был вызван ни разу");

    // Модель должна лежать в кэше со статусом error.
    var group = groups[0];
    var key = no.Model.key("photo", group.params);
    var photo = no.Model.get("photo", key);
    is(photo.retries, 3, "Модель была запрошена максимальное количество раз (3)");
    ok(!photo.canRetry(), "Модель больше не может быть запрошена");
    is(photo.status, "error", "Статус модели - error");

    server.restore();
});

module("Запрос связанных моделей");

var generateTest = function(test_case) {
    return function() {
        test_case.photo_index = 0;
        test_case.comments_index = 0;

        // Реальные данные.
        var photo = {
            id: 42,
            rootCommentId: "root-3-73741478-548823"
        };
        var comments = {
            fake_data: 666
        };

        // Фейковый сервер: должен отвечать исходя из того, что в test_case:
        // false - вернуть 404 / 403 / пустую строку.
        // true - вернуть валидные данные.
        var server = sinon.fakeServer.create();

        server.respondWith(
            "GET",
            /^\/models\/.*_model\.\d=photo.*$/,
            function(req) {
                var result = test_case.photo[test_case.photo_index++];
                if (result) {
                    req.respond(200, {}, '{ "0": { "result": ' + JSON.stringify(photo) + ' } }');
                } else {
                    req.respond(404);
                }
            }
        );

        server.respondWith(
            "GET",
            /^\/models\/.*_model\.\d=comments.*$/,
            function(req) {
                var result = test_case.comments[test_case.comments_index++];
                if (result) {
                    req.respond(200, {}, '{ "0": { "result": ' + JSON.stringify(comments) + ' } }');
                } else {
                    req.respond(404);
                }
            }
        );

        // Хендлеры для проверки того, что они вызвались верно.
        var then = sinon.spy();
        var else_ = sinon.spy();

        // Конструируем запрос.
        var params = {
            'author-login': "chestozo",
            'image-id': 42
        };

        // Сбрасываем кэш, потому как тесты выполняются в одном и том же контексте.
        no.Model._cache = {}; // HARD reset models cache

        // Поехали: создаём request.
        var request = new no.Request([
            {
                models: [ "photo", "comments" ],
                params: params
            }
        ]);
        var promise = request.start();
        promise
            .then(then)
            .else_(else_);

        // Сервер до сих пор ждал, а сейчас начинает отвечать. Причём, отвечает он мгновенно.
        server.respond();

        // Проверка, какие колбэки вызывались.
        is(then.callCount, 1, "Then был вызван один раз");
        is(else_.callCount, 0, "Else не был вызван ни разу");

        // Что в кэше.
        var cached_photo = no.Model.get("photo", no.Model.key("photo", params));
        var photo_retries = test_case.photo.length;
        var photo_success = test_case.photo[photo_retries - 1];

        is(cached_photo.retries, photo_retries, "Количество запросов для получения фото");
        if (photo_success) {
            is(cached_photo.status, "ok", "Статус фото: ok");
            deepEqual(cached_photo.getData(), photo, "Фото в кэше то, что надо");
        } else {
            is(cached_photo.status, photo_retries > 0 ? "error" : "none", "Статус фото");
        }

        var cached_comments = no.Model.get("comments", no.Model.key("comments", params));
        var comments_retries = test_case.comments.length;
        var comments_success = test_case.comments[comments_retries - 1];

        is(cached_comments.retries, comments_retries, "Количество запросов для получения комментариев");
        if (comments_success) {
            is(cached_comments.status, "ok", "Статус комментов: ok");
            deepEqual(cached_comments.getData(), comments, "Комменты в кэше то, что надо");
        } else {
            is(cached_comments.status, comments_retries > 0 ? "error" : "none", "Статус комментов");
        }

        server.restore();
    };
};

// [photo,comments] -> photo:ok
// [comments] -> comments:ok
// [] -> done
test("Test case: photo [ true ] comments [ true ]", generateTest({ photo: [ true ], comments: [ true ] }));

// [photo,comments] -> photo:fail
// [photo,comments] -> photo:ok
// [comments] -> comments:ok
// [] -> done
test("Test case: photo [ false, true ] comments [ true ]", generateTest({ photo: [ false, true ], comments: [ true ] }));

// [photo,comments] -> photo:ok
// [comments] -> comments:fail
// [comments] -> comments:ok
// [] -> done
test("Test case: photo [ true ] comments [ false, true ]", generateTest({ photo: [ true ], comments: [ false, true ] }));

// [photo,comments] -> photo:fail
// [photo,comments] -> photo:fail
// [photo,comments] -> photo:fail
// [] -> done ?
test("Test case: photo [ false, false, false ] comments []", generateTest({ photo: [ false, false, false ], comments: [] }));

// [photo,comments] -> photo:ok
// [comments] -> comments:fail
// [comments] -> comments:fail
// [comments] -> comments:fail
// [] -> done photo:ok comments:clear cache
test("Test case: photo [ true ] comments [ false, false, false ]", generateTest({ photo: [ true ], comments: [ false, false, false ] }));

// ----------------------------------------------------------------------------------------------------------------- //
module("Misc");

test("Недостаточно данных даже для запроса первой модели", function() {

});

test("Недостаточно данных для запроса второй модели", function() {
    var server = sinon.fakeServer.create();
    server.respondWith(
        "GET",
        /^\/models\/.*_model\.\d=photo.*$/,
        function(req) {
            req.respond(200, {}, '{ "0": { "result": ' + JSON.stringify(photo) + ' } }');
        }
    );

    // Хендлеры для проверки того, что они вызвались верно.
    var then = sinon.spy();
    var else_ = sinon.spy();

    // Конструируем запрос.
    var params = {
        'image-id': 42
    };

    // Сбрасываем кэш, потому как тесты выполняются в одном и том же контексте.
    no.Model._cache = {}; // HARD reset models cache

    // Поехали: создаём request.
    var request = new no.Request([
        {
            models: [ "photo", "comments" ],
            params: params
        }
    ]);
    var promise = request.start();
    promise
        .then(then)
        .else_(else_);

    // Сервер до сих пор ждал, а сейчас начинает отвечать. Причём, отвечает он мгновенно.
    server.respond();

    // Проверка, какие колбэки вызывались.
    is(then.callCount, 1, "Then был вызван один раз");
    is(else_.callCount, 0, "Else не был вызван ни разу");

    // Что в кэше.
    var key = no.Model.key("photo", params);
    var cached_photo = no.Model.get("photo", key);
    strictEqual(cached_photo.retries, 0, "Модель для фото хоть и создалась - не должна была запроситься, так как недостаточно параметров");
    strictEqual(cached_photo.status, "none", "Статус должен был остаться неопределённым");

    server.restore();
});

test("После получения фото мы всё равное не можем запросить комментарии, потому что не вернулся нужный параметр", function() {
    // Реальные данные.
    var photo = {
        id: 42
    };

    var server = sinon.fakeServer.create();
    server.respondWith(
        "GET",
        /^\/models\/.*_model\.\d=photo.*$/,
        function(req) {
            req.respond(200, {}, '{ "0": { "result": ' + JSON.stringify(photo) + ' } }');
        }
    );

    // Хендлеры для проверки того, что они вызвались верно.
    var then = sinon.spy();
    var else_ = sinon.spy();

    // Конструируем запрос.
    var params = {
        'author-login': "chestozo",
        'image-id': 42
    };

    // Сбрасываем кэш, потому как тесты выполняются в одном и том же контексте.
    no.Model._cache = {}; // HARD reset models cache

    // Поехали: создаём request.
    var request = new no.Request([
        {
            models: [ "photo", "comments" ],
            params: params
        }
    ]);
    var promise = request.start();
    promise
        .then(then)
        .else_(else_);

    // Сервер до сих пор ждал, а сейчас начинает отвечать. Причём, отвечает он мгновенно.
    server.respond();

    // Проверка, какие колбэки вызывались.
    is(then.callCount, 1, "Then был вызван один раз");
    is(else_.callCount, 0, "Else не был вызван ни разу");

    // Что в кэше.
    var cached_photo = no.Model.get("photo", no.Model.key("photo", params));
    is(cached_photo.retries, 1, "Количество запросов для получения фото");
    is(cached_photo.status, "ok", "Статус фото: ok");
    deepEqual(cached_photo.getData(), photo, "Фото в кэше то, что надо");

    var cached_comments = no.Model.get("comments", no.Model.key("comments", params));
    is(cached_comments.retries, 0, "Количество запросов для получения комментариев");
    is(cached_comments.status, "none", "Статус комментов");

    server.restore();
});
