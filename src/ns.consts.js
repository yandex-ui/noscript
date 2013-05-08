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
