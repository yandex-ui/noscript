(function() {

    /**
     * Модуль управления "страницей" и переходами между ними.
     * @namespace
     */
    ns.page = {};

    /**
     * Current page params
     * @type {{page: string, params: Object}}
     */
    ns.page.current = {};

    /**
     * Адрес текущей страницы
     * @type {string}
     */
    ns.page.currentUrl = null;

    /**
     * Осуществляем переход по ссылке.
     * @param {string} [url=ns.page.getCurrentUrl()]
     * @param {string} [action='push'] Добавить, заменить ('replace') запись, не модифицировать ('preserve') историю браузера.
     * @returns {Vow.Promise}
     */
    ns.page.go = function(url, action) {
        if (!action) {
            action = 'push';
        } else if (action === true) {
            action = 'replace';
        }

        url = url || ns.page.getCurrentUrl();

        // возможность заблокировать переход
        if (!ns.page.block.check(url)) {
            // Если мы нажали кнопку "Назад" в браузере, то событие popstate произойдет уже после смены url
            // соответственно надо поменять урл на старый, если он поменялся
            if (url !== ns.page.currentUrl) {
                ns.history.replaceState(ns.page.currentUrl);
            }
            return Vow.reject('block');
        }

        var route = ns.router(url);

        // router says "redirect"
        if (route.page === ns.R.REDIRECT) {
            return ns.page.redirect(route.redirect);
        }

        if (route.page === ns.R.NOT_APP_URL) {
            if (action === 'replace') {
                window.location.replace(route.redirect);
            } else {
                window.location = route.redirect;
            }

            // return empty non-resolved promise becase we are redirecting now
            return new Vow.Promise();
        }

        var layout = ns.layout.page(route.page, route.params);

        ns.events.trigger('ns-page-before-load', [ns.page.current, route], url);

        var prevPage = {
            url: ns.page.currentUrl,
            route: ns.page.current
        };

        ns.page.current = route;
        // save layout for async-view updates
        ns.page.current.layout = layout;

        ns.page.currentUrl = url;

        if (action === 'push') {
            // записываем в историю все переходы
            ns.history.pushState(url);
        } else if (action === 'replace') {
            ns.history.replaceState(url);
        }

        ns.page.history.push(url);
        document.title = ns.page.title(url);

        var update = new ns.Update(ns.MAIN_VIEW, layout, route.params);
        var updatePromise = update.start();

        // сообщаем, что страница поменялась
        if (prevPage.url !== ns.page.currentUrl) {
            ns.events.trigger('ns-page-changed', prevPage, updatePromise);
        }

        return updatePromise;
    };

    /**
     * Redirects to given url.
     * @param {string} url New page url.
     * @returns {Vow.Promise}
     */
    ns.page.redirect = function(url) {
        ns.history.replaceState(url);
        return ns.page.go(url, true);
    };

    /**
     * Returns document title.
     * @param {string} url Page URL.
     * @returns {string}
     */
    ns.page.title = function(url) {
        return 'NoScript app ' + url;
    };

    /**
     * Устанавливает начальное состояние
     * @private
     */
    ns.page._reset = function() {
        this.current = {};
        this.currentUrl = null;
    };

    /**
     * Returns default url for NoScript application.
     * Should be redefined.
     */
    ns.page.getDefaultUrl = function() {
        return ns.router.url('/');
    };

    /**
     * Calculates current application url, fed as default value for `ns.page.go`.
     */
    ns.page.getCurrentUrl = function() {
        return window.location.pathname + window.location.search;
    };

})();
