//  ---------------------------------------------------------------------------------------------------------------  //
//  Layout consts
//  ---------------------------------------------------------------------------------------------------------------  //

ns.L = {};

ns.L.VIEW = 'view';
ns.L.ASYNC = 'async';
ns.L.BOX = 'box';

// ----------------------------------------------------------------------------------------------------------------- //

/**
 * Константы для ns.View.
 * @type {Object}
 * @constant
 */
ns.V = {};

/**
 * Статусы View.
 * @enum {Number}
 * @constant
 */
ns.V.STATUS = {
    /**
     * Нет никакого кеша.
     */
    NONE: 'none',

    /**
     * Есть заглушка, данные для полноценного View загружаются.
     */
    LOADING: 'loading',

    /**
     * Есть кеш и он валиден.
     */
    OK: 'ok',

    /**
     * Есть кеш и он помечен невалидным, при следующем апдейте он должен перерисоваться.
     */
    INVALID: 'invalid'
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
 * Константы для ns.Model.
 * @type {Object}
 * @constant
 */
ns.M = {};

/**
 * Статусы Model.
 * @enum {String}
 * @constant
 */
ns.M.STATUS = {
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

/**
 * Константы для ns.router.
 * @enum {String}
 * @constant
 */
ns.R = {

    /**
     * ID страницы, не относящейся к noscript приложению.
     */
    NOT_APP_URL: 'ns-router-not-app',

    /**
     * ID необъявленной/ненайденной страницы
     */
    NOT_FOUND: 'not-found',

    /**
     * ID страницы-редиректа.
     * Тут специально выбрано длинное название,
     * чтобы не пересечься с нормальными страницами.
     */
     REDIRECT: 'ns-router-redirect'
};

/**
 * Constants for ns.Updater.
 * @type {Object}
 * @constant
 */
ns.U = {};

/**
 * Statuses of ns.Updater.
 * @enum {Number}
 * @constant
 */
ns.U.STATUS = {
    /**
     * Updater failed because of models request
     */
    'MODELS': 'models',

    /**
     * Updater failed because it expired (new Updater is running)
     */
    'EXPIRED': 'expired'
};

/**
 * Execution statuses of ns.Updater.
 * @enum {Number}
 * @constant
 */
ns.U.EXEC = {
    'GLOBAL': 'global',
    'ASYNC': 'async',
    'PARALLEL': 'parallel'
};
