/**
 * Хеш событий для удобного биндинга touch/desktop
 * @type {object}
 */
ns.V.EVENTS = {
    'click': 'click',
    'dblclick': 'dblclick',
    'mousedown': 'mousedown',
    'mousemove': 'mousemove',
    'mouseup': 'mouseup'
};

/**
 * Список DOM-событий.
 * @type {Array}
 * @constant
 */
ns.V.DOM_EVENTS = [
    'blur',
    'change',
    'input',
    'click',
    'dblclick',
    'dragstart',
    'dragenter',
    'dragover',
    'dragleave',
    'drag',
    'drop',
    'dragend',
    'focus',
    'focusin',
    'focusout',
    'keydown',
    'keypress',
    'keyup',
    'mousedown',
    'mouseenter',
    'mouseleave',
    'mousemove',
    'mouseout',
    'mouseover',
    'mouseup',
    'resize',
    'scroll',
    'submit'
];

/**
 * Список внутренних Noscript-событий.
 * @type {Array}
 * @constant
 */
ns.V.NS_EVENTS = [
    'ns-view-async',
    'ns-view-init',
    'ns-view-htmlinit',
    'ns-view-show',
    'ns-view-touch',
    'ns-view-hide',
    'ns-view-htmldestroy'
];
