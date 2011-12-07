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

    var ta = typeof a;
    var tb = typeof b;

    if (ta !== tb) { return false; }

    if (ta === 'object') {
        for (var key in a) {
            if (!no.object.isEqual(a[key], b[key])) { return false; }
        }
        // Проверяем, что в b нет "лишних" ключей (не входящих в a).
        for (var key in b) {
            if (!(key in a)) { return false; }
        }
    } else {
        var l = a.length;
        if (b.length !== l) { return false; }
        for (var i = 0; i < l; i++) {
            if (!no.object.isEqual(a[i], b[i])) { return false };
        }
    }

    return true;
};

