/**
 * noscript MVC framework
 * @namespace
 */
var ns = {};

if (typeof window === 'undefined') {
    module.exports = ns;
}

/**
 * Global events bus.
 * @mixin {no.Events}
 */
ns.events = no.extend( {}, no.Events );

/**
 * @const
 * @type {Boolean}
 */
ns.IS_TOUCH = Boolean(
    'ontouchstart' in window ||
    (window.DocumentTouch && document instanceof DocumentTouch)
);

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

/**
 * Parse query string to object.
 * @param {String} s Query string
 * @returns {Object}
 */
ns.parseQuery = function(s) {
    var o = {};

    s.split('&').forEach(function(chunk) {
        var p = chunk.split('=');
        var name = p[0];
        if (name) {
            var value = p[1];

            // &c=
            if (typeof value === 'undefined') {
                value = '';

            } else {
                try {
                    value = decodeURIComponent(value);
                } catch(e) {
                    value = '';
                    ns.log.info('ns.parseQuery.invalid-param', {
                        query: s,
                        chunk: chunk
                    });
                }
            }

            o[name] = value;
        }
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
    ns.history.init();
    ns.initMainView();
};

/**
 * Инициализирует корневой View.
 */
ns.initMainView = function() {
    var mainView = ns.View.create('app');
    mainView._setNode(document.getElementById('app'));
    mainView.invalidate();

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

/**
 * Выполняет проверку, что первый аргумент истиннен.
 * Если это не так - кидает ошибку.
 * @param {?} truthy Любое значение, которое проверяется на истинность.
 * @param {String} contextName Контекст для быстрого поиска места возникновения ошибки.
 * @param {String} message Сообщение об ошибке.
 */
ns.assert = function(truthy, contextName, message) {
    if (!truthy) {
        ns.assert.fail.apply(this, Array.prototype.slice.call(arguments, 1));
    }
};

/**
 * Кидает ошибку с понятным сообщением.
 * @param {String} contextName Контекст для быстрого поиска места возникновения ошибки.
 * @param {String} message Сообщение об ошибке.
 */
ns.assert.fail = function(contextName, message) {
    var messageArgs = Array.prototype.slice.call(arguments, 2);
    for (var i = 0; i < messageArgs.length; i++) {
        message = message.replace('%s', messageArgs[i]);
    }
    throw new Error('[' + contextName + '] ' + message);
};

if (window['mocha']) {

    /**
     * Clean internal data after tests
     */
    ns.clean = function() {
        ns.layout.undefine();
        ns.View.undefine();
        ns.Model.undefine();
        ns.request.clean();
        ns.router.undefine();
        ns.page.current = {};

        ns.MAIN_VIEW = null;
    };
}
