// ------------------------------------------------------------------------------------------------------------- //
// no.object
// ------------------------------------------------------------------------------------------------------------- //

no.object = {};

/**
    @param {!Object} obj
    @return {Array.<string>} Возвращает список всех ключей объекта.
*/
no.object.keys = function(obj) {
    var keys = [];

    for (var key in obj) {
        keys.push(key);
    }

    return keys;
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

