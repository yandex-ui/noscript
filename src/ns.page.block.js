(function() {

    /**
     * Module to add checkers and block proceed to another URL.
     * @namespace
     */
    ns.page.block = {};

    /**
     * Array of checkers
     * @private
     * @type {Function[]}
     */
    ns.page.block._checkers = [];

    /**
     * Добавляет функцию блокировки.
     * @description
     * Функция блокировки должна вернуть false, если переход нельзя осуществить.
     * @param {Function} fn
     * @return {ns.page.block}
     */
    ns.page.block.add = function(fn) {
        ns.page.block._checkers.push(fn);

        return this;
    };

    /**
     * Remove function to check.
     * @param {Function} fn
     * @return {ns.page.block}
     */
    ns.page.block.remove = function(fn) {
        var checkers = ns.page.block._checkers;
        var index = checkers.indexOf(fn);
        if (index > -1) {
            checkers.splice(index, 1);
        }

        return this;
    };

    /**
     * Очищает все функции блокировки.
     * @return {ns.page.block}
     */
    ns.page.block.clear = function() {
        ns.page.block._checkers = [];
        return this;
    };

    /**
     * Detect if possible to go to the url.
     * You can add your own checkers with ns.page.block.add(checkerFn)
     * @param {string} url URL to go.
     * @return {Boolean}
     */
    ns.page.block.check = function(url) {
        var checkers = ns.page.block._checkers;
        for (var i = 0, j = checkers.length; i < j; i++) {
            if (checkers[i](url) === false) {
                return false;
            }
        }

        return true;
    };

})();
