(function(ns) {

    /* jshint unused: false */

    /**
     * Модуль логирования ошибок.
     * @namespace
     */
    ns.log = {};

    /**
     * @param {...*} str
     */
    ns.log.debug = function(str) {
        console.log.apply(console, arguments);
    };

    /**
     * Логирует сообщение.
     * @param {String} name Название сообщение.
     * @param {Object} [data] Данные
     * @param {String} [longText] Дополнительные данные. Длинная строка, которую надо разбить на части.
     */
    ns.log.info = function(name, data, longText) {

    };

    /**
     * Логирует ошибку.
     * @param {String} name Название ошибки.
     * @param {Object} [data] Данные
     * @param {String} [longText] Дополнительные данные. Длинная строка, которую надо разбить на части.
     */
    ns.log.error = function(name, data, longText) {

    };

    /**
     * Логирует JS-исключение.
     * @param {String} name Название ошибки.
     * @param {Error} exception Пойманное исключение.
     * @param {Object} [data] Дополнительные данные.
     */
    ns.log.exception = function(name, exception, data) {

    };

})(ns);
