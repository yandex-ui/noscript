(function(/** @type no */no, undefined) {

/**
 * Объект, реализующий экшены.
 * @namespace
 */
no.action = {};

//  ---------------------------------------------------------------------------------------------------------------  //

var _actions = {};

/**
 * Флаг инициализации событий.
 * @type {Boolean}
 * @private
 */
var _inited = false;

// ----------------------------------------------------------------------------------------------------------------- //

/**
 * Register action.
 * @param {string} id Action id.
 * @param {function} action Action to be performed.
 */
no.action.define = function(id, action) {
    if (id in _actions) {
        throw "No.action '" + id + "' can't be redefined!";
    }
    _actions[id] = action;
};

/**
 * Copy action with different name.
 * @param {String} existentAction Action id.
 * @param {String} newAction Action id.
 */
no.action.copy = function(existentAction, newAction) {
    if (newAction in _actions) {
        throw "No.action '" + newAction + "' can't be redefined!";
    }
    if (!(existentAction in _actions)) {
        throw "No.action '" + existentAction + "' doesn't exist!";
    }
    _actions[newAction] = _actions[existentAction];
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
 *
 * @param {String} id
 * @param {Object} params
 * @param {Element} node
 * @param {Event} event
 * @return {*}
 */
no.action.run = function(id, params, node, event) {
    var action = _actions[id];
    if (action) {
        try {
            return action(id, params, node, event);
        } catch(e) {
            no.log.exception('action', e);
        }
    }
};

no.action.getParams = function(node) {
    var paramString = node.getAttribute('data-params');
    if (paramString && paramString.charAt(0) === '{') {
        try {
            return JSON.parse(paramString);
        } catch(e) {}
    }

    //TODO: parseURL?
    return {};
};

/**
 * Инициализует механизм экшенов (навешивает обработчики событий).
 */
no.action.init = function() {
    if (_inited) {
        return;
    }

    _inited = true;

    /**
     * Регулярное выражение для проверки js в ссылках.
     * @example <a href=" javascripT://w3.org/%0a%61%6c%65%72%74%28document.cookie%29">test</a>
     * @type {RegExp}
     */
    var HREF_JS_REGEXP = /^\s*javascript:/i;

    var reHasNsActionClass = /\bns-action\b/;

    $("body")
        // если вешать "click", то мобильные браузеры на pushState показывают и скрывают адресную строку, что не красиво
        // если вешать "touchstart" или "touchend", то такого не будет
        .on(no.V.EVENTS.click, "a, .ns-action", function(e) {
            var target = e.currentTarget;
            var href = target.getAttribute('href');
            var action = (e.type === 'dblclick') ? target.getAttribute('data-dblclick-action') : target.getAttribute('data-click-action');
            var returnValue = true;

            if (action && (action in _actions) && reHasNsActionClass.test(target.className)) {
                returnValue = no.action.run(action, no.action.getParams(target), target, e);

            } else if (e.type === no.V.EVENTS.click) {
                if (!href) {
                    return true;
                }
                if (HREF_JS_REGEXP.test(href)) {
                    return false;
                }
                if (href.indexOf('conf:sip:') == 0 || href.indexOf('meet:sip:') == 0) {
                    return true;
                }

                // если host ссылки не равен нашему хосту
                if (target.host != window.location.host) {
                    return true;
                }

                //TODO: HISTORY_API_SUPPORT: hash или не хеш
                //могут быть ссылки <a href="#hash" target="_blank"/>
                if (target.getAttribute('target') != '_blank') {
                    window.history.pushState(null, 'mail', href);
                    returnValue = no.page.go(href);
                    if (returnValue instanceof no.Promise) {
                        return false;
                    }
                }
            }

            return (returnValue === undefined || returnValue instanceof no.Promise) ? false : returnValue;
        });

    //TODO: no-submit
    //TODO: no-hover
    //TODO: data-counter -> no.counter()
};

//  ---------------------------------------------------------------------------------------------------------------  //

})(no);

