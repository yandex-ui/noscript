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
     * @param {string|boolean} [action='push'] Добавить, заменить ('replace') запись, не модифицировать ('preserve') историю браузера.
     * @returns {Vow.Promise}
     * @fires ns.page#ns-page-after-load
     * @fires ns.page#ns-page-before-load
     * @fires ns.page#ns-page-error-load
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

        /**
         * Сейчас будет переход на другую страницу.
         * @event ns.page#ns-page-before-load
         * @param routes {array} Маршруты: 0 - предыдущий, 1 - новый.
         * @param url {string} Новый урл.
         */
        ns.events.trigger('ns-page-before-load', [ns.page.current, route], url);

        return ns.page.followRoute(route)
            .then(function() {

                ns.page._setCurrent(route, url);
                ns.page._fillHistory(url, action);
                ns.page.title();

                return ns.page.startUpdate(route);
            }, triggerPageErrorLoad);
    };

    ns.page.followRoute = function(route) {
        /* jshint unused: false */
        return Vow.fulfill();
    };

    /**
     * Запускает процесс отрисовки страницы.
     * @param {ns.router~route} route Маршрут для перехода.
     * @returns {Vow.Promise}
     */
    ns.page.startUpdate = function(route) {
        var layout = ns.layout.page(route.page, route.params);

        var update = new ns.Update(ns.MAIN_VIEW, layout, route.params);
        return update.start().then(triggerPageAfterLoad, triggerPageErrorLoad);
    };

    /**
     * Заполняет ns.page.current перед запуском ns.Update
     * @param {ns.router~route} route Маршрут.
     * @param {string} url Новый урл.
     * @private
     */
    ns.page._setCurrent = function(route, url) {
        ns.page.current = route;
        ns.page.currentUrl = url;
    };

    /**
     * Заполняет историю переходов перез запуском ns.Update
     * @param {string} url Новый урл.
     * @param {string} action Действие (push/replace)
     * @private
     */
    ns.page._fillHistory = function(url, action) {
        if (action === 'push') {
            // записываем в историю все переходы
            ns.history.pushState(url);

        } else if (action === 'replace') {
            ns.history.replaceState(url);
        }

        ns.page.history.push(url);
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
     * Sets document title.
     * @returns {string}
     */
    ns.page.title = function() {
        document.title = 'NoScript app ' + ns.page.currentUrl.url;
    };

    /**
     * Устанавливает начальное состояние
     * @private
     */
    ns.page._reset = function() {
        this.current = {};
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

    /**
     * Триггерит событие "Произошла успешная загрузка страницы"
     * @param {*} val
     */
    function triggerPageAfterLoad(val) {
        /**
         * Произошла успешная загрузка страницы
         * @event ns.page#ns-page-after-load
         */
        ns.events.trigger('ns-page-after-load', val);

        // proxy fullfill value
        return val;
    }

    /**
     * Триггерит событие "Произошла неуспешная загрузка страницы"
     * @param {*} err
     */
    function triggerPageErrorLoad(err) {
        /**
         * Произошла неуспешная загрузка страницы
         * @event ns.page#ns-page-error-load
         */
        ns.events.trigger('ns-page-error-load', err);

        // proxy reject value
        return Vow.reject(err);
    }

})();
