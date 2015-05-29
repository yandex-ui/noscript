/**
 * @const
 * @type {Boolean}
 */
ns.IS_TOUCH = (function() {
    // даем возможность определять IS_TOUCH приложению
    if (typeof window['NS_IS_TOUCH'] === 'boolean') {
        return window['NS_IS_TOUCH'];
    } else {
        return Boolean(
            'ontouchstart' in window ||
            (window.DocumentTouch && document instanceof DocumentTouch)
        );
    }
})();

//TODO: Pointer events support (MSIE 10)

// @see http://sitr.us/2011/07/28/how-mobile-safari-emulates-mouse-events.html
// @see http://developer.apple.com/library/safari/#documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html
if (ns.IS_TOUCH) {
    ns.V.DOM_EVENTS.push(
        'swipe',
        'swipeleft',
        'swiperight',
        'tap',
        'touchstart',
        'touchmove',
        'touchend'
    );
    ns.V.EVENTS = {
        'click': 'tap',
        'dblclick': 'doubletap',
        'mousedown': 'touchstart',
        'mousemove': 'touchmove',
        'mouseup': 'touchend'
    };

}
