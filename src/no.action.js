(function(/**no*/no, undefined) {

//  ---------------------------------------------------------------------------------------------------------------  //
//  no.action
//  ---------------------------------------------------------------------------------------------------------------  //

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
        throw "No.action can't be redefined!";
    }
    _actions[id] = action;
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
    if (paramString.charAt(0) === '{') {
        try {
            // @chestozo: может обернём в какой-нибудь no.json? no.json.parse()?
            return JSON.parse(paramString);
        } catch(e) {}
    }

    //TODO: parseURL?
    return paramString;
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
    // @chestozo: может все regexp'ы в константы вынести?
    var HREF_JS_REGEXP = /^\s*javascript:/i;

    // @chestozo: может быть делать это через наше рутовое view: app ?
    $("body")
        .on("click dblclick", "a, .no-action", function(e) {
            var target = e.currentTarget;
            var $target = $(target);
            var href = target.getAttribute('href');
            var action = (e.type === 'dblclick') ? target.getAttribute('data-dblclick-action') : target.getAttribute('data-click-action');
            var returnValue = true;

            //TODO: "no-action" как-то буэээ
            if (action && (action in _actions) && $target.hasClass('no-action')) {
                // @chestozo: может просто ноду передавать, а params внутри run будут вытягиваться?
                returnValue = no.action.run(action, no.action.getParams(target), target, e);

            } else if (e.type === 'click') {
                if (!href) {
                    return true;
                }
                if (HREF_JS_REGEXP.test(href)) {
                    return false;
                }
                // @chestozo: чего это такое? )
                if (href.indexOf('conf:sip:') == 0 || href.indexOf('meet:sip:') == 0) {
                    return true;
                }

                // если host ссылки не равен нашему хосту
                // @chestozo: мы ограничиваем action'ы только нашим хостом? почему?
                if (target.host != window.location.host) {
                    return true;
                }

                //TODO: HISTORY_API_SUPPORT: hash или не хеш
                //могут быть ссылки <a href="#hash" target="_blank"/>
                if (target.getAttribute('target') != '_blank') {
                    // @chestozo: mail )
                    window.history.pushState(null, 'mail', href);
                    returnValue = no.page.go(href);
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

