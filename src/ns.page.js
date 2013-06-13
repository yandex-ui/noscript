/**
 * Модуль управления "страницей" и переходами между ними.
 * @namespace
 */
ns.page = {};

/**
 * Осуществляем переход по ссылке.
 * @param {String} [url=location.pathname + location.search]
 * @param {Boolean} [preventAddingToHistory=false] Не добавлять урл в историю браузера.
 * @return {no.Promise}
 */
ns.page.go = function(url, preventAddingToHistory) {
    if (ns.page._stop) {
        ns.page._lastUrl = url;

        return no.Promise.rejected('transaction');
    }

    var loc = window.location;

    url = url || (ns.history.legacy ? loc.hash.substr(1) : (loc.pathname + loc.search));

    // возможность заблокировать переход
    if (!ns.page.block.check(url)) {
        // Если мы нажали кнопку "Назад" в браузере, то событие popstate произойдет уже после смены url
        // соответственно надо поменять урл на старый, если он поменялся
        if (url != ns.page.currentUrl) {
            ns.history.replaceState(ns.page.currentUrl);
        }
        return no.Promise.rejected('block');
    }

    var route = ns.router(url);
    if (route === false) {
        return no.Promise.rejected('no-route');
    }

    var layout = ns.layout.page(route.page, route.params);

    ns.events.trigger('ns-page-before-load', [ns.page.current, route]);

    /**
     * Текущие параметры страницы.
     * @type {{page: string, params: Object}}
     */
    ns.page.current = route;
    ns.page.currentUrl = url;

    if (!preventAddingToHistory) {
        // записываем в историю все переходы
        ns.history.pushState(url);
    }

    document.title = ns.page.title(url);

    var update = new ns.Update(ns.MAIN_VIEW, layout, route.params);
    return update.start();
};

ns.page.redirect = function(url) {
    ns.history.replaceState(url);
    ns.page.go(url, true);
};

/**
 * Returns document title.
 * @param {String} url Page URL.
 * @returns {string}
 */
ns.page.title = function(url) {
    return 'NoScript app ' + url;
};

/**
 * Module to add checkers and block proceed to another URL.
 * @namespace
 */
ns.page.block = {

    /**
     * Array of checkers
     * @private
     * @type {Function[]}
     */
    checkers: []
};

/**
 * Add function to check.
 * @param {Function} fn
 * @returns {ns.page.block}
 */
ns.page.block.add = function(fn) {
    ns.page.block.checkers.push(fn);

    return this;
};

/**
 * Remove function to check.
 * @param {Function} fn
 * @returns {ns.page.block}
 */
ns.page.block.remove = function(fn) {
    var index = ns.page.block.checkers.indexOf(fn);
    if (index > -1) {
        ns.page.block.checkers.splice(index, 1);
    }

    return this;
};

/**
 * Detect if possible to go to the url.
 * You can add your own checkers with ns.page.block.add(checkerFn)
 * @param {String} url URL to go.
 * @returns {Boolean}
 */
ns.page.block.check = function(url) {
    var checkers = ns.page.block.checkers;
    for (var i = 0, j = checkers.length; i < j; i++) {
        if (checkers[i](url) === false) {
            return false;
        }
    }

    return true;
};
