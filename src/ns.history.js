(function() {

    /**
     * Объект для работы с историей и адресной строкой браузера.
     * @namespace
     * @tutorial ns.history
     */
    ns.history = {};

    /**
     *
     */
    ns.history.init = function() {
        $(window).on('popstate', function(e) {
            // прибиваем событие, чтобы не дергалась адресная строка
            e.preventDefault();
            e.stopPropagation();

            ns.history.onpopstate(e);
        });
    };

    /**
     *
     * @param {string} url
     * @param {string} [title]
     */
    ns.history.pushState = function(url, title) {
        if (isFunction(window.history.pushState)) {
            window.history.pushState(null, title || ns.page.title(url), url);
        }
    };

    /**
     *
     * @param {string} url
     * @param {string} [title]
     */
    ns.history.replaceState = function(url, title) {
        if (isFunction(window.history.replaceState)) {
            window.history.replaceState(null, title || ns.page.title(url), url);
        }
    };

    /**
     *
     */
    ns.history.onpopstate = function() {
        ns.page.go('', true);
    };

    /**
     * Проверяет, является ли переданный объект функцией.
     * @param  {Function} fn
     * @returns {Boolean}
     */
    function isFunction(fn) {
        return 'function' === typeof fn;
    }

})();
