// For jshint.
/*global no: true, module: true, test: true, ok: true, equal: true */

include('../src/no/no.js');
include('../src/no/no.promise.js');
include('../src/no/no.js');
include('../src/no/no.object.js');
include('../src/no/no.http.js');
include('../src/no/no.promise.js');

include('../src/no/no.model.js');

// ----------------------------------------------------------------------------------------------------------------- //
module("Регистрация новой модели");

test("Модель без параметров", function() {
    var model;
    var id = "test_model";
    var type_info = { params: null };
    var create = function(model_id, type_info) {}

    no.Model.register(id, type_info, create);
    model = no.Model.get(id);

    ok(model, "Модель может не иметь параметров");
});

// ----------------------------------------------------------------------------------------------------------------- //
module("Ключ модели");

test("Генерация ключа", function() {
    var id = "for_test";
    var info;
    var instance;

    no.Model.register(
        id,
        {
            params: { id: 3, name: "Vasya Pupkin" }
        }
    );
    info = no.Model.info(id);
    instance = new no.Model(id, info);

    equal(instance.getKey({}), "model=for_test", "Пустой набор параметров: параметры не передаются вообще");
    equal(instance.getKey({ id: 3 }), "model=for_test", "Параметры со значениями по умолчанию не передаются");
    equal(instance.getKey({ id2: 3 }), "model=for_test", "Только зарегистрированные параметры передаются");

    equal(instance.getKey({ id: "3" }), "model=for_test&id=3", "Не поддерживается приведение типа для значений параметров");
    equal(instance.getKey({ id: 4, name: "Hey" }), "model=for_test&id=4&name=Hey", "Если у параметра значение отличается от значения поумолчанию - он передаётся");
});
