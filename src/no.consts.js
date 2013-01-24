//  ---------------------------------------------------------------------------------------------------------------  //
//  Layout consts
//  ---------------------------------------------------------------------------------------------------------------  //

no.L = {};

no.L.VIEW = 'view';
no.L.ASYNC = 'async';
no.L.BOX = 'box';

// ----------------------------------------------------------------------------------------------------------------- //

/**
 * Константы для no.View.
 * @type {Object}
 * @constant
 */
no.V = {};

/**
 * Статусы View.
 * @enum {Number}
 * @constant
 */
no.V.STATUS = {
    /**
     * Нет никакого кеша.
     */
    NONE: 1,

    /**
     * Есть заглушка, данные для полноценного View загружаются.
     */
    LOADING: 2,

    /**
     * Есть кеш и он валиден.
     */
    OK: 3,

    /**
     * Есть кеш и он помечен невалидным, при следующем апдейте он должен перерисоваться.
     */
    INVALID: 4
};

/**
 * Список DOM-событий.
 * @type {Array}
 * @constant
 */
no.V.DOM_EVENTS = [
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
    'submit',
//TODO: сделать прозрачные (mousedown/touchstart/MSPointerDown) константы в зависимости от окружения
// пример тут https://github.com/nolimits4web/Swiper/blob/master/dist/idangerous.swiper-1.7.js
    'touchstart',
    'touchmove',
    'touchend'
];

// ----------------------------------------------------------------------------------------------------------------- //

/**
 * Константы для no.Model.
 * @type {Object}
 * @constant
 */
no.M = {};

/**
 * Статусы Model.
 * @enum {String}
 * @constant
 */
no.M.STATUS = {
    /**
     * "Ошибка": данные загрузились с ошибкой.
     */
    ERROR: 'error',

    /**
     * "Нет данных": данные еще не загружались.
     */
    NONE: 'none',

    /**
     * "Все хорошо": данные загрузились успешно.
     */
    OK: 'ok',

    /**
     * "Невалидна": данные есть, но кто-то пометил их невалидными.
     */
    INVALID: 'invalid'
};
