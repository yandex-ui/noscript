(function(ns, undefined) {

    /**
     * Объект, реализующий экшены.
     * @namespace
     */
    ns.action = {};

    var _actions = {};

    /**
     * Флаг инициализации событий.
     * @type {Boolean}
     * @private
     */
    var _inited = false;

    /**
     * Регулярное выражение для проверки js в ссылках.
     * @example <a href=" javascripT://w3.org/%0a%61%6c%65%72%74%28document.cookie%29">test</a>
     * @type {RegExp}
     */
    var HREF_JS_REGEXP = /^\s*javascript:/i;

    var reHasNsActionClass = /\bns-action\b/;

    /**
     * Register action.
     * @param {string} id Action id.
     * @param {function} action Action to be performed.
     */
    ns.action.define = function(id, action) {
        if (id in _actions) {
            throw new Error("[ns.action] Can't redefine '" + id + "'");
        }
        _actions[id] = action;
    };

    /**
     * Copy action with different name.
     * @param {string} existentAction Action id.
     * @param {string} newAction Action id.
     */
    ns.action.copy = function(existentAction, newAction) {
        if (newAction in _actions) {
            throw new Error("[ns.action] Can't redefine '" + newAction + "'");
        }
        if (!(existentAction in _actions)) {
            throw new Error("[ns.action] '" + existentAction + "' is not defined");
        }
        _actions[newAction] = _actions[existentAction];
    };

    /**
     * Run action by name
     * @param {string} id Action name
     * @param {object} [params] Params
     * @param {Element} [node]
     * @param {Event} [event]
     * @return {*}
     */
    ns.action.run = function(id, params, node, event) {
        var action = _actions[id];
        if (action) {
            try {
                return action(id, params, node, event);
            } catch(e) {
                ns.log.exception('action', e);
            }
        }
    };

    /**
     * Получает параметры экшена из ноды
     * @param {Node} node
     * @return {object}
     */
    ns.action.getParams = function(node) {
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
    ns.action.init = function() {
        if (_inited) {
            return;
        }

        _inited = true;

        var $body = $('body');
        var selector = 'a, .ns-action';
        var events = [
            ns.V.EVENTS.click,
            ns.V.EVENTS.dblclick
        ].join(' ');

        $body.on(events, selector, this._process);
        /*
        if (Modernizr && Modernizr.touch) {
            */
            /*
             @doochik: тут все странно

             1) pushState на мобильных надо делать в touchstart или touchend, чтобы не дергалась адресная строка
                плюс click в мобильных генерится с задержкой (ее даже в консоле видно на глаз)
             2) touchstart/end - общие события. По ним нельзя однозначно определить клик это или скролл. События tap - нет :(
                Поэтому приходится вешаться touchstart - touchmove - touchend и выщитывать смещение тача, чтобы понять скролл или клик.
                Возможно (я надеюсь), если более правильно решение. Сейчас это выглядит как костыль
             3) сделать общий обработчик desktop/mobile не получается. Потому что в touchend можно прибить последующий click, а в mouseup - нельзя.

             Как вариант, не надо вешать события на "a", а надо только на ns-action. Тогда проблем с "click" не будет, потому что ns-action обычно не сссылки и click на них ни к чему не приведет.
             Тогда надо ловить все переходы по ссылкам в popState/hashchange, а не тут.
             */
            /*

            var pointerStartPageX, pointerStartPageY;
            var pointerLastPageX, pointerLastPageY;
            var that = this;

            // эмпирически подобрано число. Если меньше этого смещение - клик, иначе - движение (dnd, scroll, ...)
            var pointerOffsetLimit = 5;

            $body
                .on(ns.V.EVENTS.mousedown, selector, function(e) {
                    e = e.originalEvent;
                    pointerLastPageX =  pointerStartPageX = e.pageX;
                    pointerLastPageY = pointerStartPageY = e.pageY;
                })
                .on(ns.V.EVENTS.mousemove, selector, function(e) {
                    e = e.originalEvent;
                    pointerLastPageX = e.pageX;
                    pointerLastPageY = e.pageY;
                })
                .on(ns.V.EVENTS.mouseup, selector, function(e) {
                    // если вешать "click", то мобильные браузеры на pushState показывают и скрывают адресную строку, что не красиво
                    // если вешать "touchstart" или "touchend", то такого не будет

                    //катет по Y
                    var cathetusA = Math.abs(pointerLastPageY - pointerStartPageY);
                    //катет по X
                    var cathetusB = Math.abs(pointerLastPageX - pointerStartPageX);
                    var hypotenuse = Math.sqrt(Math.pow(cathetusA, 2) + Math.pow(cathetusB, 2));

                    // если смещение больше предела - то это какое-то действие
                    // не реагируем на него
                    if (hypotenuse > pointerOffsetLimit) {
                        // чтобы прибить "click"
                        e.preventDefault();
                        return true;
                    }

                    return that._process(e);
                });

        } else {
            $body.on('click', selector, this._process);
        }
        */
        //TODO: no-submit
        //TODO: no-hover
        //TODO: data-counter -> ns.counter()
    };

    /**
     * Process "click" event
     * @param {jQuery.Event} e
     * @return {boolean}
     * @private
     */
    ns.action._process = function(e) {
        var target = e.currentTarget;
        var href = target.getAttribute('href');
        var action = (e.type === 'dblclick') ? target.getAttribute('data-dblclick-action') : target.getAttribute('data-click-action');
        var returnValue = true;

        if (action && (action in _actions) && reHasNsActionClass.test(target.className)) {
            returnValue = ns.action.run(action, ns.action.getParams(target), target, e);

        } else if (ns.V.EVENTS.click) {
            if (!href) {
                return true;
            }

            if (HREF_JS_REGEXP.test(href)) {
                return false;
            }

            // Чтобы работал Cmd/Ctrl/Shift + click на ссылках (открыть в новом табе/окне).
            if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
                return true;
            }

            // если hostname ссылки не равен нашему хосту
            if (target.hostname !== window.location.hostname) {
                return true;
            }

            // TODO: HISTORY_API_SUPPORT: hash или не хеш
            // могут быть ссылки <a href="#hash" target="_blank"/>
            if (target.getAttribute('target') !== '_blank') {
                returnValue = ns.page.go(href);
                if (Vow.isPromise(returnValue)) {
                    // stop go to link, but not bubbling
                    e.preventDefault();
                    return true;
                }
            }
        }

        return (returnValue === undefined || Vow.isPromise(returnValue)) ? false : returnValue;
    };

})(ns);
