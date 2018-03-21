(function() {

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
     * Replace url in history.
     * @param {string} url
     */
    ns.page.history.replace = function(url) {
        var nsHistory = ns.page.history;
        var previousUrl = nsHistory._history.pop();
        var currentUrl = nsHistory._current;

        // prevent duplicates in history after replace
        if (previousUrl && previousUrl !== url && currentUrl !== url) {
            nsHistory._history.push(previousUrl);
        }

        // save current
        nsHistory._current = url;
    };

    ns.page.history.redirect = function(url) {
        var nsHistory = ns.page.history;

        nsHistory._current = url;
        nsHistory._previous = nsHistory.getPrevious();
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

    /**
     * Сбрасывает данные в начальное состояние.
     * Метод используется в тестах.
     */
    ns.page.history.reset = function() {
        ns.page.history._current = null;
        ns.page.history._history = [];
    };

})();
