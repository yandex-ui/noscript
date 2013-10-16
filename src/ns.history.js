(function() {

/**
 * Объект для работы с историей и адресной строкой браузера.
 */
ns.history = {};

ns.history.init = function() {
    $(window).on('popstate', function(e) {
        // прибиваем событие, чтобы не дергалась адресная строка
        e.preventDefault();
        e.stopPropagation();

        ns.history.onpopstate(e);
    });
};

ns.history.pushState = function(url, title) {
    window.history.pushState(null, title || ns.page.title(url), url);
};

ns.history.replaceState = function(url, title) {
    window.history.replaceState(null, title || ns.page.title(url), url);
};

ns.history.onpopstate = function() {
    ns.page.go('', true);
};

})();
