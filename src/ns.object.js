/**
 * Хелперы для работы с объектами
 * @namespace
 */
ns.object = {};

/**
 * Клонирует объект.
 * @param {object} obj Объект для клонирования.
 * @returns {object}
 */
ns.object.clone = function(obj) {
    if (obj && typeof obj === 'object') {
        var r;

        if ( Array.isArray(obj) ) {
            r = [];
            for (var i = 0; i < obj.length; i++) {
                r.push( ns.object.clone( obj[i] ) );
            }
        } else {
            r = {};
            for (var key in obj) {
                r[key] = ns.object.clone( obj[key] );
            }
        }

        return r;
    }

    return obj;
};

/**
 * Определяет, пустой ли объект или нет.
 * @param {object} obj Тестируемый объект.
 * @returns {boolean}
 */
ns.object.isEmpty = function(obj) {
    /* jshint unused: false */
    for (var key in obj) {
        return false;
    }

    return true;
};

/**
 * FIXME: Как-то это все коряво. Нужно переписать и прооптимизировать.
 * NOTE: doochik@: в expect.js есть отличный сравнятор, можно взять оттуда
 * @param {object} a
 * @param {object} b
 * @returns {boolean}
 */
ns.object.isEqual = function(a, b) {
    if (a === b) { return true; }
    if (a == null || b == null) { return false; }

    var ta = typeof a;
    var tb = typeof b;

    if (ta !== tb) { return false; }

    //  NOTE: Удивительно, но все попытки сравнивать массивы не через for in
    //  приводят только к замедлению. По крайней мере, в FF.

    //  Проверяем, что в b нет "лишних" ключей (не входящих в a).
    //
    //  NOTE: Эту проверку лучше делать до сравнения значений (следующий for in).
    //  Т.к. чтобы убедиться, что объекты одинаковые, в любом случае придется выполнить
    //  оба цикла, а если объекты разные, то быстрее найти "лишний" ключ, чем
    //  сравнить все значения.
    //
    if (typeof a === 'object') {
        for (var keyB in b) {
            if ( !(keyB in a) ) { return false; }
        }

        for (var keyA in a) {
            if ( !ns.object.isEqual( a[keyA], b[keyA] ) ) { return false; }
        }
    } else {
        //  Это два скаляра (string, boolean, number) и они точно не равны,
        //  т.к. это проверяется в первой строке метода.
        return false;
    }

    return true;
};
