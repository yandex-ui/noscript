no.object = {};

no.object.clone = function(obj) {
    if (obj && typeof obj === 'object') {
        var r;

        if ( Array.isArray(obj) ) {
            r = [];
            for (var i = 0; i < obj.length; i++) {
                r.push( no.object.clone( obj[i] ) );
            }
        } else {
            r = {};
            for (var key in obj) {
                r[key] = no.object.clone( obj[key] );
            }
        }

        return r;
    }

    return obj;
};

/**
    @param {!Object} obj
    @return {boolean} Определяет, пустой ли объект или нет.
*/
no.object.isEmpty = function(obj) {
    for (var key in obj) {
        return false;
    }

    return true;
};

//  FIXME: Как-то это все коряво. Нужно переписать и прооптимизировать.
//NOTE: doochik@: в expect.js есть отличный сравнятор, можно взять оттуда
no.object.isEqual = function(a, b) {
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
        for (var key in b) {
            if ( !(key in a) ) { return false; }
        }

        for (var key in a) {
            if ( !no.object.isEqual( a[key], b[key] ) ) { return false; }
        }
    } else {
        //  Это два скаляра (string, boolean, number) и они точно не равны,
        //  т.к. это проверяется в первой строке метода.
        return false;
    }

    return true;
};
