(function(ns) {

    /**
     * Модуль логирования ошибок.
     * @namespace
     */
    ns.log = {};

    /**
     * @param {...*} str
     */
    ns.log.debug = function(str) {
        /* jshint unused: false */
//        console.log.apply(console, arguments);
    };

    /**
     * Логирует сообщение.
     * @param {string} name Название сообщение.
     * @param {object} [data] Данные
     * @param {string} [longText] Дополнительные данные. Длинная строка, которую надо разбить на части.
     */
    ns.log.info = function(name, data, longText) {
        /* jshint unused: false */
    };

    /**
     * Логирует ошибку.
     * @param {string} name Название ошибки.
     * @param {object} [data] Данные
     * @param {string} [longText] Дополнительные данные. Длинная строка, которую надо разбить на части.
     */
    ns.log.error = function(name, data, longText) {
        /* jshint unused: false */
    };

    /**
     * Логирует JS-исключение.
     * @param {string} name Название ошибки.
     * @param {Error} exception Пойманное исключение.
     * @param {object} [data] Дополнительные данные.
     */
    ns.log.exception = function(name, exception, data) {
        /* jshint unused: false */
    };

})(ns);
