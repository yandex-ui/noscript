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
     * Действие с историей по умолчанию.
     * @constant
     * @type {string}
     */
    ns.page.DEFAULT_HISTORY_ACTION = 'push';

    /**
     * Осуществляем переход по ссылке.
     * @param {string} [url=ns.page.getCurrentUrl()]
     * @param {string} [historyAction='push'] Действие с историей браузера: добавить ('push'), заменить ('replace'), ничего не делать ('preserve').
     * @returns {Vow.Promise}
     * @fires ns.page#ns-page-after-load
     * @fires ns.page#ns-page-before-load
     * @fires ns.page#ns-page-error-load
     */
    ns.page.go = function(url, historyAction) {
        if (!historyAction) {
            historyAction = ns.page.DEFAULT_HISTORY_ACTION;

        } else if (historyAction === true) {
            // этот вариант оставлен для совместимости
            historyAction = 'replace';
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

        if (route.page === ns.R.NOT_APP_URL) {
            if (historyAction === 'replace') {
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

        // не надо пушить в историю тот же самый URL
        // это очень легко сделать, если просто обновлять страницу через ns.page.go()
        if (historyAction === 'push' && url === ns.page.currentUrl) {
            historyAction = 'preserve';
        }

        return ns.page.followRoute(route)
            .then(function() {

                ns.page._setCurrent(route, url);
                ns.page._fillHistory(url, historyAction);

                // router says "redirect"
                if (route.page === ns.R.REDIRECT) {
                    return ns.page.redirect(route.redirect);
                }

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
        // action еще может быть "preserve", т.е. ничего не делаем
        switch (action) {
            case 'init':
                ns.page.history.push(url);
                break;
            case 'push':
                ns.history.pushState(url);
                ns.page.history.push(url);
                break;
            case 'replace':
                ns.history.replaceState(url);
                ns.page.history.replace(url);
                break;
            case'redirect':
                ns.history.replaceState(url);
                ns.page.history.redirect(url);
                break;
        }
    };

    /**
     * Redirects to given url.
     * @param {string} url New page url.
     * @returns {Vow.Promise}
     */
    ns.page.redirect = function(url) {
        ns.history.replaceState(url);
        return ns.page.go(url, 'redirect');
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
        this.currentUrl = '';
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
