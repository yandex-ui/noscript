var no = no || require('nommon');
var ns = ns || require('./ns.js');

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
     *
     * @type {null}
     */
    ns.page.currentUrl = null;

    /**
     *
     * @type {boolean}
     * @private
     */
    ns.page._stop = false;

    /**
     *
     * @type {string}
     * @private
     */
    ns.page._lastUrl = '';

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

        if (ns.page._stop) {
            ns.page._lastUrl = url;

            return Vow.reject('transaction');
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
        return update.start();
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
     * @param {string} url URL to go.
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
     * Object to work with application history.
     * @namespace
     */
    ns.page.history = {};

    /**
     * Current application url.
     * @type {string}
     * @private
     */
    ns.page.history._current = null;

    /**
     * History of application urls.
     * @type {Array}
     * @private
     */
    ns.page.history._history = [];

    /**
     * Saves url in history.
     * @param {string} url
     */
    ns.page.history.push = function(url) {
        var nsHistory = ns.page.history;

        // save previous url to history
        if (nsHistory._current) {

            // prevent duplicates
            if (nsHistory._current !== url) {
                var prevPage = ns.page.history.getPrevious();

                // user pressed back button in browser
                if (prevPage === url) {
                    nsHistory._history.pop();

                } else {
                    nsHistory._history.push(nsHistory._current);
                }
            }
        }

        nsHistory._current = url;
    };

    /**
     * Go to previous page and delete it from history.
     * @returns {Vow.Promise}
     */
    ns.page.history.back = function() {
        var nsHistory = ns.page.history;

        var previousPage = nsHistory.getPrevious();
        if (previousPage) {
            // removes last entry
            nsHistory._history.pop();

        } else {
            // get default url
            previousPage = ns.page.getDefaultUrl();
        }

        // delete current history url
        nsHistory._current = previousPage;

        return ns.page.go(previousPage);
    };

    /**
     * Returns previous page.
     * @param {number} [n=0] N pages ago
     * @returns {string}
     */
    ns.page.history.getPrevious = function(n) {
        n = n || 0;
        var history = ns.page.history._history;
        var l = history.length;
        // Предыдущая страница, если есть.
        return history[l - n - 1];
    };

})();
