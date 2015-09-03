(function() {

    /**
     * Объект для работы с историей и адресной строкой браузера.
     * @namespace
     * @tutorial ns.history
     */
    ns.history = {};

    /**
     * Ицициализирует обработчики события popstate/hashchange и кликов по ссылкам (<a href=""/>).
     */
    ns.history.init = function() {
        $(window).on('popstate', function(e) {
            // прибиваем событие, чтобы не дергалась адресная строка
            e.preventDefault();
            e.stopPropagation();

            ns.history.onpopstate(e);
        });

        $(document).on(ns.V.EVENTS.click, 'a', ns.history._onAnchorClick);
    };

    /**
     * Добавляет урл в историю браузера.
     * @param {string} url
     * @param {string} [title]
     */
    ns.history.pushState = function(url, title) {
        if (isFunction(window.history.pushState)) {
            window.history.pushState(null, title || ns.page.title(url), url);
        }
    };

    /**
     * Заменяет урл в истории браузера.
     * @param {string} url
     * @param {string} [title]
     */
    ns.history.replaceState = function(url, title) {
        if (isFunction(window.history.replaceState)) {
            window.history.replaceState(null, title || ns.page.title(url), url);
        }
    };

    /**
     * Метод реакции на изменение адреса.
     */
    ns.history.onpopstate = function() {
        ns.page.go('', true);
    };

    /**
     * Метод перехода на ссылке из <a>.
     * @description Приложение может модифицифровать этот метод,
     * чтобы реализовать собственную логику.
     *
     * @param {string} href
     * @param {HTMLElement} target
     * @returns {Vow.Promise}
     */
    ns.history.followAnchorHref = function(href, target) {
        /* jshint unused: false */
        return ns.page.go(href);
    };

    /**
     * Обработчик кликов на <a>.
     * @description Не обрабатываются следующие клики:
     *  - если клик был с нажатым alt/ctrl/meta/shift
     *  - если hostname у ссылки отличается от текущего hostname
     *  - если у ссылки нет href
     *  - если у ссылки есть target="_blank"
     * @param {Event} e
     * @private
     */
    ns.history._onAnchorClick = function(e) {
        var target = e.currentTarget;

        // Чтобы работал Cmd/Ctrl/Shift + click на ссылках (открыть в новом табе/окне).
        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
            return true;
        }

        // если hostname ссылки не равен нашему хосту, то она внешняя и ее обрабатывать не надо
        if (target.hostname !== window.location.hostname) {
            return true;
        }

        // если ссылка ведет в другой baseDir, то она внешняя и ее обрабатывать не надо
        if (ns.router.baseDir) {
            var linkPath = target.pathname;
            var baseDir = ns.router.baseDir;
            if (linkPath.substr(0, baseDir.length) !== baseDir) {
                return true;
            }
        }

        var href = target.getAttribute('href');

        if (!href || target.getAttribute('target')) {
            return true;
        }

        var returnValue = ns.history.followAnchorHref(href, target);
        // если вернули Promise, то ссылка была обработана и
        // надо сделать preventDefault
        if (Vow.isPromise(returnValue)) {
            e.preventDefault();
            return true;
        }
    };

    /**
     * Проверяет, является ли переданный объект функцией.
     * @param  {Function} fn
     * @returns {Boolean}
     */
    function isFunction(fn) {
        return 'function' === typeof fn;
    }

})();
