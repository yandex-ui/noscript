include('../src/no/no.js');

module("no.extendRecursive");

test("Рекурсивное копирование объекта не приводит к копироваю ссылок на объекты-свойства", function() {
    var a = { prop: { inner: 7 } };

    // Обычный no.extend копирует ссылки.
    var b = no.extend({}, a);
    var c = no.extend({}, a);

    c.prop.inner = 9;

    strictEqual(9, a.prop.inner, "Свойство исходного объекта поменялось"); // Это может быть источником ошибок.
    strictEqual(9, b.prop.inner, "Свойство первого объекта, который не трогали, также поменалось"); // И это тоже!
    strictEqual(9, c.prop.inner, "Свойство объекта источника также поменалось, но это как раз и должно было произойти");

    // no.extendRecursive был написан специально для того, чтобы не было такого.
    var a1 = { prop: { inner: 7 } };

    var b1 = no.extendRecursive({}, a1);
    var c1 = no.extendRecursive({}, a1);

    b1.prop.inner = 8;
    strictEqual(7, a1.prop.inner);
    strictEqual(8, b1.prop.inner);
    strictEqual(7, c1.prop.inner);

    c1.prop.inner = 9;
    strictEqual(7, a1.prop.inner);
    strictEqual(8, b1.prop.inner);
    strictEqual(9, c1.prop.inner);

    a1.prop.inner = 1;
    strictEqual(1, a1.prop.inner);
    strictEqual(8, b1.prop.inner);
    strictEqual(9, c1.prop.inner);
});
