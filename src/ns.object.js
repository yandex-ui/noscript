var ns = ns || require('./ns.js');

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
