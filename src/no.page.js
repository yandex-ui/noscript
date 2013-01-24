/**
 * Модуль управления "страницей" и переходами между ними.
 * @namespace
 */
no.page = {};

/**
 * Осуществляем переход по ссылке.
 * @param {String} [url=location.pathname + location.search]
 * @return {no.Promise}
 */
no.page.go = function(url) {
    //TODO: return promise

    var loc = window.location;

    // @chestozo: а какже hash?
    url = url || (loc.pathname + loc.search);

    // подготавливаем
    url = no.page.urlPrepare(url);

    // возможность заблокировать переход
    if (url === false) {
        return new no.Promise().reject();
    }

    var route = no.router(url);
    if (route === false) {
        return new no.Promise().reject();
    }
    var layout = no.layout.page(route.page, route.params);

    no.events.trigger('no:page-before-load', [no.page.current, route]);
    /**
     * Текущие параметры страницы.
     * @type {{page: string, params: Object}}
     */
    no.page.current = route;

    var update = new no.Update(no.MAIN_VIEW, layout, route.params);
    return update.start();
};

no.page.redirect = function(url) {
    // @chestozo: упс
    window.history.replaceState(null, 'mail', url);
    no.page.go(url);
};

/**
 * Подготавливает url.
 * @return {String}
 */
no.page.urlPrepare = function(url) {
    return url;
};
