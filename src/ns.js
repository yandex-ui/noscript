/**
 * noscrpt
 * @namespace
 */
var ns = {};

if (typeof window === 'undefined') {
    module.exports = ns;
}

/**
 * @const
 * @type {Boolean}
 */
ns.IS_TOUCH = Boolean(window['Modernizr'] && Modernizr.touch && window['$'] && $.mobile);

/**
 * FIXME: зачем оно тут?
    Do not clone functions, only data.
    @param {!Object} dest
    @param {!Object} src
    @return {!Object}
*/
ns.extendRecursive = function(dest, src) {
    for (var key in src) {
        var value = src[key];

        if (value instanceof Array) {
            var ar = dest[key] = [];
            for (var j = 0, m = value.length; j < m; j++) {
                var item = value[j];
                ar[j] = (typeof item === 'object') ? ns.extendRecursive( {}, item ) : item;
            }

        } else if (typeof value === 'object') {
            dest[key] = ns.extendRecursive( {}, value );

        } else {
            dest[key] = value;

        }
    }

    return dest;
};

ns.todo = function() {
    throw new Error('Unimplemented');
};

ns.parseQuery = function(s) {
    var o = {};

    s.split('&').forEach(function(s) {
        var p = s.split('=');
        //  FIXME: decode-бла-бла.
        o[ p[0] ] = p[1];
    });

    return o;
};

/**
 * Performs json templating.
 * @param {*} json
 * @param {String} mode
 * @param {String} [module='main']
 * @returns {Element}
 */
ns.tmpl = function(json, mode, module) {
    var result = yr.run(module || 'main', json, mode);
    return ns.html2node(result);
};

/**
 * Производит первоначальную инициализацию noscript.
 */
ns.init = function() {
    ns.action.init();
    ns.router.init();

    ns.history.adapt();
    ns.initMainView();
};

/**
 * Инициализирует корневой View.
 */
ns.initMainView = function() {
    var mainView = ns.View.create('app');
    mainView.node = document.getElementById('app');

    /**
     * Корневой View.
     * @type {ns.View}
     */
    ns.MAIN_VIEW = mainView;
};

/**
 * Создает транзакцию (cb) и блокирует вызов ns.page.go
 * @param {Function} cb
 */
ns.transaction = function(cb) {
    // останавливаем ns.page.go
    ns.page._stop = true;
    cb();

    // запускаем ns.page.go
    ns.page._stop = false;
    ns.page.go(ns.page._lastUrl);
};
