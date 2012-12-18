/**
 * Модуль управления "страницей" и переходами между ними.
 * @namespace
 */
no.page = {};

/**
 * Осуществляем переход по ссылке.
 * @param {String} [url=location.pathname + location.search]
 */
no.page.go = function(url) {
    //TODO: return promise

    var loc = window.location;

    url = url || (loc.pathname + loc.search);

    // подготавливаем
    url = no.page.urlPrepare(url);

    // возможность заблокировать переход
    if (url === false) {
        return;
    }

    var route = no.router(url);
    var layout = no.layout.page(route.page, route.params);

    no.events.trigger('no:page-before-load', [no.page.current, route]);
    /**
     * Текущие параметры страницы.
     * @type {{page: string, params: Object}}
     */
    no.page.current = route;

    var update = new no.Update(no.MAIN_VIEW, layout, route.params);
    update.start();
};

/**
 * Подготавливает url.
 * @return {String}
 */
no.page.urlPrepare = function(url) {
    return url;
};

window.addEventListener('popstate', function(e) {
    no.page.go();
    e.preventDefault();
}, false);
