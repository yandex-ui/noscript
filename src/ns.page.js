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
     * Состояние переходов между страницами
     *
     * @type {{ url: string, count: number }}
     * @private
     */
    ns.page._lastTransition = {
        url: null,
        count: 0
    };

    /**
     * Устанавливает урл перехода, если нужно то увеличивает счётчик переходов на страницу
     *
     * Не учитывает переход, если это обновление страницы
     *
     * @param {string} url
     * @param {boolean} isPageRefresh
     */
    ns.page._lastTransition.set = function(url, isPageRefresh) {
        if (isPageRefresh || !url) {
            return;
        }

        if (this.url === url) {
            ++this.count;
        } else {
            this.url = url;
            this.count = 1;
        }
    };

    /**
     * Сбрасывает состояние перехода, если есть несколько переходов на страницу, то уменьшает счётчик переходов,
     * если есть всего 1 активный переход на данную страницу, то сбрасывает url
     *
     * Не сбрасывает переход, если это обновление страницы
     *
     * @param {string} url
     * @param {boolean} isPageRefresh
     */
    ns.page._lastTransition.unset = function(url, isPageRefresh) {
        if (!isPageRefresh && this.url && this.url === url) {
            var count = Math.max(this.count - 1, 0);
            this.count = count;
            this.url = count ? this.url : null;
        }
    };

    /**
     * Определяет, нужно ли блокировать переход (обновление страницы) из-за другого перехода
     * @param {string} url
     * @param {boolean} isPageRefresh
     * @return {boolean}
     */
    ns.page._lastTransition.shouldBlockByTransition = function(url, isPageRefresh) {
        return isPageRefresh && this.url && this.url !== url;
    };

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

        var isPageRefresh = false;

        if (!url) {
            url = ns.page.getCurrentUrl();
            isPageRefresh = true;
        }

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

        ns.page._lastTransition.set(url, isPageRefresh);

        // не надо пушить в историю тот же самый URL
        // это очень легко сделать, если просто обновлять страницу через ns.page.go()
        if (historyAction === 'push' && url === ns.page.currentUrl) {
            historyAction = 'preserve';
        }

        return ns.page.followRoute(route)
            .then(function() {
                if (ns.page._lastTransition.shouldBlockByTransition(url, isPageRefresh)) {
                    ns.log.debug(
                        '[ns.page.go] refresh ' + url + ' blocked by transition to ' + ns.page._lastTransition.url
                    );

                    return Vow.reject('block by transition');
                }

                ns.page._setCurrent(route, url);
                ns.page._fillHistory(url, historyAction);

                // router says "redirect"
                if (route.page === ns.R.REDIRECT) {
                    return ns.page.redirect(route.redirect);
                }

                ns.page.title();

                return ns.page.startUpdate(route);

            }, triggerPageErrorLoad)
            .then(
                function(data) {
                    ns.page._lastTransition.unset(url, isPageRefresh);
                    return data;
                },
                function(err) {
                    ns.page._lastTransition.unset(url, isPageRefresh);
                    return Vow.reject(err);
                }
            );
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
