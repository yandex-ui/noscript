// ------------------------------------------------------------------------------------------------------------- //
// no.object
// ------------------------------------------------------------------------------------------------------------- //

no.object = {};

/**
    @param {!Object} obj
    @return {Array.<string>} Возвращает список всех ключей объекта.
*/
no.object.keys = Object.keys || function(obj) {
    var keys = [];

    for (var key in obj) {
        keys.push(key);
    }

    return keys;
};

/**
    @param {!Object} obj
    @return {Array.<string>} Возвращает список всех значений объекта.
*/
no.object.values = function(obj) {
    var values = [];

    for (var key in obj) {
        values.push( obj[key] );
    }

    return values;
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

no.object.isEqual = function(a, b) {
    if (a === b) { return true; }
    if (a == null || b == null) { return false; }

    //  NOTE: Удивительно, но все попытки сравнивать массивы не через for in
    //  приводят только к замедлению. По крайней мере, в FF.

    //  Проверяем, что в b нет "лишних" ключей (не входящих в a).
    //
    //  NOTE: Эту проверку лучше делать до сравнения значений (следующий for in).
    //  Т.к. чтобы убедиться, что объекты одинаковые, в любом случае придется выполнить
    //  оба цикла, а если объекты разные, то быстрее найти "лишний" ключ, чем
    //  сравнить все значения.
    //
    for (var key in b) {
        if ( !(key in a) ) { return false; }
    }

    for (var key in a) {
        if ( !no.object.isEqual( a[key], b[key] ) ) { return false; }
    }

    return true;
};

no.object.forEach = function(obj, action) {
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            action(obj[key], key);
        }
    }
}

