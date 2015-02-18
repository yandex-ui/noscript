/**
 * noscript MVC framework
 * @namespace
 * @version 0.2.0
 * @tutotial entities
 */
var ns = {};

/**
 * Удобная функция для расстановки TODO, кидает исключение при вызове.
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
        var name = p.shift();
        if (name) {
            // В значении параметра может быть знак равенства
            var value = p.join('=');

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

            if (name in o) {
                // если параметры имеют вид ?id=1&id=2&id=3,
                // то на выходе должен получиться массив

                // если массива еще нет, то создаем его
                if (!Array.isArray(o[name])) {
                    o[name] = [ o[name] ];
                }

                o[name].push(value);
            } else {
                o[name] = value;
            }
        }
    });

    return o;
};

/**
 * Накладывает шаблон.
 * @param {*} json
 * @param {string} mode Модификатор.
 * @param {string} [module='main'] Название модуля.
 * @returns {string}
 */
ns.renderString = function(json, mode, module) {
    return yr.run(module || 'main', json, mode);
};

/**
 * Накладывает шаблон и возвращает полученную ноду.
 * @param {*} json Данные
 * @param {string} mode Модификатор.
 * @param {string} [module='main'] Название модуля.
 * @returns {HTMLElement}
 */
ns.renderNode = function(json, mode, module) {
    return ns.html2node(ns.renderString(json, mode, module));
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
        key += '&' + pName + '=' + ns.key._getStrWithEscapedSpecialChars(params[pName]);
    }
    return key;
};

/**
 * Массив управляющих символов
 * @private
 * @type {array}
 */
ns.key._unescapedChars = ['\0', '\b', '\t', '\r', '\n', '\v', '\f'];

/**
 * Массив заэкранированных управляющих символов
 * @private
 * @type {array}
 */
ns.key._escapedChars = ['\\0', '\\b', '\\t', '\\r', '\\n', '\\v', '\\f'];

/**
 * Экранирует управляющие символы в строке
 * @private
 * @param  {string} str исходная строка
 * @return {string} строка с заэкранированными символами
 */
ns.key._getStrWithEscapedSpecialChars =  function(str) {
    var source = str.toString().split('');

    for (var i = 0, l = source.length; i < l; i++) {
        var k = ns.key._unescapedChars.indexOf(source[i]);

        if (k >= 0) {
            source[i] = ns.key._escapedChars[k];
        }
    }
    return source.join('');
};

/**
 * Конкатенирует параметры в GET-запрос
 * @param {object} params Параметры запроса
 * @returns {string}
 */
ns.params2query = function(params) {
    var query = [];

    var pName;
    var pValue;
    for (pName in params) {
        pValue = params[pName];
        if (Array.isArray(pValue)) {
            for (var i = 0; i < pValue.length; i++) {
                query.push(encodeURIComponent(pName) + '=' + encodeURIComponent(pValue[i]));
            }
        } else {
            query.push(encodeURIComponent(pName) + '=' + encodeURIComponent(pValue));
        }
    }

    return query.join('&');
};

/**
 * Clean internal data after tests
 */
ns.reset = function() {
    // в сборке для node.js его нет
    if (ns.action) {
        ns.action._reset();
    }
    ns.router._reset();
    ns.layout._reset();
    ns.Model._reset();
    ns.View._reset();
    ns.request._reset();
    ns.page._reset();

    ns.MAIN_VIEW = null;
};
