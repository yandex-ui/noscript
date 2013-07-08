(function(/** @type ns */ns) {

    // @see http://jsperf.com/entityify-test

    var ENTITYIFY_REGEXP = /[<>"]/g;
    var ENTITYIFY_REPLACER = (function() {
        var chars = {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;'
        };
        return function(c) {
            return chars[c];
        };
    })();

    /**
     * Преобразует специальные символы в HTML сущности.
     * @param {String} s Строка
     * @returns {String}
     */
    ns.entityify = function(s) {
        return s.toString().replace(ENTITYIFY_REGEXP, ENTITYIFY_REPLACER);
    };


    /**
     * Регулярка для поиска html-entity.
     * @type {RegExp}
     */
    var DEENTITYIFY_REGEXP = /&([^&;]+);/g;
    var DEENTITYIFY_REPLACER = (function() {
        var chars = {
            lt:   '<',
            gt:   '>',
            amp:  '&',
            quot: '"'
        };
        return function(a, b) {
            return chars[b] || a;
        };
    })();

    /**
     * Преобразует HTML-сущности в символы.
     * @param {String} s Строка
     * @returns {String}
     */
    ns.deentityify = function(s) {
        return s.replace(DEENTITYIFY_REGEXP, DEENTITYIFY_REPLACER);
    };

})(ns);
