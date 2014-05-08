/**
 * noscript MVC framework
 * @namespace
 * @version 0.2.0
 * @tutotial entities
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
 *
 */
ns.todo = function() {
    throw new Error('Unimplemented');
};

/**
 * Parse query string to object.
 * @param {string} s Query string
 * @returns {object}
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
 * @param {string} mode
 * @param {string} [module='main']
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
 * @param {string} contextName Контекст для быстрого поиска места возникновения ошибки.
 * @param {string} message Сообщение об ошибке.
 */
ns.assert = function(truthy, contextName, message) {
    /* jshint unused: false */
    if (!truthy) {
        ns.assert.fail.apply(this, Array.prototype.slice.call(arguments, 1));
    }
};

/**
 * Кидает ошибку с понятным сообщением.
 * @param {string} contextName Контекст для быстрого поиска места возникновения ошибки.
 * @param {string} message Сообщение об ошибке.
 */
ns.assert.fail = function(contextName, message) {
    var messageArgs = Array.prototype.slice.call(arguments, 2);
    for (var i = 0; i < messageArgs.length; i++) {
        message = message.replace('%s', messageArgs[i]);
    }
    throw new Error('[' + contextName + '] ' + message);
};

/**
 * Строит ключ по готовому объекту параметров.
 * @param {string} prefix Префикс ключа.
 * @param {object} params Объект с параметрами составляющими ключ.
 * @returns {string} Строка ключа.
 */
ns.key = function(prefix, params) {
    var key = prefix;
    params = params || {};
    for (var pName in params) {
        key += '&' + pName + '=' + params[pName];
    }
    return key;
};

/**
 * Clean internal data after tests
 */
ns.reset = function() {
    ns.router._reset();
    ns.layout._reset();
    ns.Model._reset();
    ns.View._reset();
    ns.request._reset();
    ns.page._reset();

    ns.MAIN_VIEW = null;
};
