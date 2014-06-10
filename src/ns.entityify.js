(function(ns) {

    // @see http://jsperf.com/entityify-test

    var ENTITYIFY_REGEXP = /[&<>"'\/]/g;
    var ENTITYIFY_REPLACER = (function() {
        // @see https://www.owasp.org/index.php/XSS_(Cross_Site_Scripting)_Prevention_Cheat_Sheet#Output_Encoding_Rules_Summary
        var chars = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        };
        return function(c) {
            return chars[c];
        };
    })();

    /**
     * Преобразует специальные символы в HTML сущности.
     * @param {string} s Строка
     * @return {string}
     */
    ns.entityify = function(s) {
        return String(s).replace(ENTITYIFY_REGEXP, ENTITYIFY_REPLACER);
    };

    /**
     * Регулярка для поиска html-entity.
     * @type {RegExp}
     */
    var DEENTITYIFY_REGEXP = /&([^&;]+);/g;
    var DEENTITYIFY_REPLACER = (function() {
        var chars = {
            'amp':  '&',
            'lt':   '<',
            'gt':   '>',
            'quot': '"',
            '#x27': "'",
            '#x2F': "/"
        };
        return function(a, b) {
            return chars[b] || a;
        };
    })();

    /**
     * Преобразует HTML-сущности в символы.
     * @param {string} s Строка
     * @return {string}
     */
    ns.deentityify = function(s) {
        return String(s).replace(DEENTITYIFY_REGEXP, DEENTITYIFY_REPLACER);
    };

})(ns);
