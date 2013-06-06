/**
 * Модуль управления "страницей" и переходами между ними.
 * @namespace
 */
ns.page = {};

/**
 * Осуществляем переход по ссылке.
 * @param {String} [url=location.pathname + location.search]
 * @return {no.Promise}
 */
ns.page.go = function(url) {
    if (ns.page._stop) {
        ns.page._lastUrl = url;

        return new no.Promise().reject();
    }
    //TODO: return promise

    var loc = window.location;

    url = url || (ns.history.legacy ? loc.hash.substr(1) : (loc.pathname + loc.search));

    // подготавливаем
    url = ns.page.urlPrepare(url);

    // возможность заблокировать переход
    if (url === false) {
        return new no.Promise().reject();
    }

    var route = ns.router(url);
    if (route === false) {
        return new no.Promise().reject();
    }
    var layout = ns.layout.page(route.page, route.params);

    no.events.trigger('no:page-before-load', [ns.page.current, route]);
    /**
     * Текущие параметры страницы.
     * @type {{page: string, params: Object}}
     */
    ns.page.current = route;

    var update = new ns.Update(ns.MAIN_VIEW, layout, route.params);
    return update.start();
};

ns.page.redirect = function(url) {
    ns.history.replaceState(url);
    ns.page.go(url);
};

/**
 * Подготавливает url.
 * @return {String}
 */
ns.page.urlPrepare = function(url) {
    return url;
};
