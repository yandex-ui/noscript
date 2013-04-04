/**
 * @fileOverview DOM events for ns.View
 */

/**
 * Хеш событий для удобного биндинга touch/desktop
 * @type {Object}
 */
ns.V.EVENTS = {
    'click': 'click',
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
    'click',
    'dblclick',
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

//TODO: Pointer events support (MSIE 10)

// @see http://sitr.us/2011/07/28/how-mobile-safari-emulates-mouse-events.html
// @see http://developer.apple.com/library/safari/#documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html
if (ns.IS_TOUCH) {
    ns.V.DOM_EVENTS.push('tap', 'touchstart', 'touchmove', 'touchend');
    ns.V.EVENTS = {
        'click': 'tap',
        'mousedown': 'touchstart',
        'mousemove': 'touchmove',
        'mouseup': 'touchend'
    };

}
