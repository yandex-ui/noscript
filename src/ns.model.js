(function() {

//  ---------------------------------------------------------------------------------------------------------------  //
//  ns.Model
//  ---------------------------------------------------------------------------------------------------------------  //

/**
 * @classdesc Базовый класс для моделей. Конструктор пустой, чтобы легче было наследоваться.
 * Вся инициализация делается в _init(), который вызывает фабрикой ns.Model.get().
 * @constructor
 * @mixes no.Events
 */
ns.Model = function() {};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Добавляем методы из no.Events: on(), off(), trigger().
no.extend(ns.Model.prototype, no.Events);

//  ---------------------------------------------------------------------------------------------------------------  //

var _ctors = {};
var _infos = {};

var _cache = {};

var _keySuffix = 0;

//  ---------------------------------------------------------------------------------------------------------------  //

/**
 * @see ns.M.STATUS
 * @enum {String}
 * @borrows ns.M.STATUS as ns.Model.prototype.STATUS
 */
ns.Model.prototype.STATUS = ns.M.STATUS;

ns.Model.prototype._init = function(id, params, data) {
    this.id = id;
    this.params = params || {};

    this._reset();

    this.info = ns.Model.info(id);
    this.key = ns.Model.key(id, params, this.info);

    this.setData(data);

    this._bindEvents();
};

ns.Model.prototype._reset = function(status) {
    this.data = null;
    this.error = null;

    this.status = status || this.STATUS.NONE;
    this.retries = 0;

    /**
     * Data version.
     * @type {number}
     * @protected
     */
    this._version = 0;
};

/**
 * Регистрирует обработчики событий.
 * @private
 */
ns.Model.prototype._bindEvents = function() {
    for (var event in this.info.events) {
        var callbacks = this.info.events[event];
        // приводим обработчики к массиву
        if (!Array.isArray(callbacks)) {
            callbacks = [callbacks];
        }

        for (var i = 0, j = callbacks.length; i < j; i++) {
            //NOTE: т.к. сейчас модели никак не удаляются, то и не надо снимать обработчики
            this.on(event, this._prepareCallback(callbacks[i]));
        }
    }
};

/**
 * Ищет метод в объекте по имени или возвращает переданную функцию
 * Нужен для навешивания коллбеков
 *
 * @param {String | Function} method
 * @return {Function}
 */
ns.Model.prototype._prepareCallback = function(method) {
    if (typeof method === 'string') {
        method = this[method];
    }

    ns.assert((typeof method === 'function'), 'ns.Model', "Can't find method '%s' in '%s' to bind event", method, this.id);

    return method;
};

ns.Model.prototype.invalidate = function() {
    this._reset(this.STATUS.INVALID);
};

ns.Model.prototype.isValid = function() {
    return (this.status === this.STATUS.OK);
};

ns.Model.prototype.getData = function() {
    return this.data;
};

/**
 * Returns data matched by jpath.
 * @param {string} jpath
 * @returns {*}
 * @example
 * var foo = model.get('.foo'); // model.data.foo.
 * var bar = model.get('.foo.bar'); // model.data.foo.bar (если foo существует).
 */
ns.Model.prototype.get = function(jpath) {
    var data = this.data;
    if (data) {
        return no.jpath(jpath, data);
    }
};

/**
 * Returns data matched by jpath.
 * This methods always returns array of results.
 * @param {string} jpath
 * @returns {array}
 */
ns.Model.prototype.select = function(jpath) {
    var data = this.data;
    if (data) {
        return no.jpath.raw(jpath, data).toArray();
    }
    return [];
};

/**
 * Сохраняет value по пути jpath.
 * @param {String} jpath jpath до значения.
 * @param {*} value Новое значение.
 * @param {Object} [options] Флаги.
 * @param {Boolean} [options.silent = false] Если true, то не генерируется событие о том, что модель изменилась.
 */
ns.Model.prototype.set = function(jpath, value, options) {
    var data = this.data;
    if ( !this.isValid() || !data ) {
        return;
    }

    //  FIXME: Непонятно, нужно ли сравнивать старое и новое значение.
    //  Как бы нужно, но это довольно дорого и сложно.
    //  Пока что будет версия без сравнения.

    no.jpath.set(jpath, data, value);
    this.touch();

    if (options && options.silent) {
        return;
    }

    //  Сообщение о том, что вообще вся модель изменилась.
    this.trigger('ns-model-changed', jpath);

    //  Кидаем сообщения о том, что изменились части модели.
    //  Например, если jpath был '.foo.bar', то кидаем два сообщения: 'ns-model-changed.foo.bar' и 'ns-model-changed.foo'.
    //  В качестве параметра подjpath и полный jpath, по которому менялись данные.

    var parts = jpath.split('.');
    var l = parts.length;
    while (l > 1) {
        var _jpath = parts.slice(0, l).join('.');

        //  TODO передавать старое значение и новое

        this.trigger('ns-model-changed' + _jpath, _jpath, jpath);
        l--;
    }
};

/**
 * Устанавливает новые данные модели.
 * @param {*} data Новые данные.
 * @param {Object} [options] Флаги.
 * @param {Boolean} [options.silent = false] Если true, то не генерируется событие о том, что модель изменилась.
 * @returns {ns.Model}
 */
ns.Model.prototype.setData = function(data, options) {
    if (data && this.hasDataChanged(data)) {

        this.data = this._beforeSetData(this.preprocessData(data));

        this.status = this.STATUS.OK;
        this.error = null;

        this.touch();

        //  Не проверяем здесь, действительно ли data отличается от oldData --
        //  setData должен вызываться только когда обновленная модель целиком перезапрошена.
        //  Можно считать, что она в этом случае всегда меняется.
        //  @chestozo: это может выйти боком, если мы, к примеру, по событию changed делаем ajax запрос
        var silent = options && options.silent;
        if (!silent) {
            this.trigger('ns-model-changed', '', '');
        }
    }

    return this;
};

ns.Model.prototype.hasDataChanged = function(data) {
    return !!data;
};

ns.Model.prototype.getError = function() {
    return this.error;
};

ns.Model.prototype.setError = function(error) {
    this.data = null;
    this.error = error;
    this.status = this.STATUS.ERROR;
};

ns.Model.prototype._beforeSetData = function(data) {
    return data;
};

ns.Model.prototype.preprocessData = function(data) {
    return data;
};

ns.Model.prototype.getRequestParams = function() {
    return ns.Model._getKeyParams(this.id, this.params, this.info);
};

/**
 * Возвращает, можно ли перезапрашивать эту модель, если предыдущий запрос не удался.
 * @returns {boolean}
 */
ns.Model.prototype.canRetry = function() {
    //  do-модели нельзя перезапрашивать.
    return ( !this.isDo() && this.retries < 3 );
};

ns.Model.prototype.extractData = function(result) {
    if (result) {
        return result.data;
    }
};

ns.Model.prototype.extractError = function(result) {
    if (result) {
        return result.error;
    }
};

ns.Model.prototype.isDo = function() {
    return this.info.isDo;
};

/**
 * Returns data version.
 * @returns {number}
 */
ns.Model.prototype.getVersion = function() {
    return this._version;
};

ns.Model.prototype.touch = function() {
    this._version++;
    this.trigger('ns-model-touched');
};

/**
 * Подготавливает модель к запросу.
 * @param {Number} requestID ID запроса.
 * @return {ns.Model}
 */
ns.Model.prototype.prepareRequest = function(requestID) {
    this.requestID = requestID;
    this.retries++;
    this.promise = new no.Promise();

    return this;
};

ns.Model.prototype.destroyWith = function(models) {
    ns.Model.destroyWith(this, models);
};

//  ---------------------------------------------------------------------------------------------------------------  //

/**
 * Models factory. Returns cached instance or creates new.
 * @static
 * @param {String} id Model's ID.
 * @param {Object} [params] Model's params.
 * @returns {ns.Model}
 */
ns.Model.get = function(id, params) {
    var model = this._find(id, params);

    if (!model) {
        var Ctor = _ctors[id];
        model = new Ctor();
        model._init(id, params);

        // stores model in cache except do-models
        if ( !model.isDo() ) {
            _cache[ id ][ model.key ] = model;
        }
    }

    return model;
};

/**
 * Returns valid cached model instance.
 * @param {String} id Model's ID.
 * @param {Object} [params] Model's params
 * @returns {ns.Model|null}
 */
ns.Model.getValid = function(id, params) {
    var model = this._find(id, params);
    if (model && model.isValid()) {
        return model;
    }
    return null;
};

/**
 * Returns cached model instance.
 * @param {String} id Model's ID.
 * @param {Object} [params] Model's params
 * @returns {ns.Model|null}
 */
ns.Model._find = function(id, params) {
    ns.assert((id in _infos), 'ns.Model', "'%s' is not defined", id);

    var key = ns.Model.key(id, params);
    return _cache[id][key] || null;
};

/**
 * Completely destroy model and delete it from cache.
 * @param {ns.Model} model
 */
ns.Model.destroy = function(model) {
    // do-models are not cached
    if ( model.isDo() ) {
        return;
    }

    var id = model.id;
    var key = model.key;

    var cached = _cache[id][key];
    if (cached) {
        // notify subscribers about disappearance
        model.trigger('ns-model-destroyed');

        // invalidate model to unsubsribe it from all listeners
        model.invalidate();

        // NOTE удалять обработчики сейчас нельзя
        // Даже, когда для модели вызывается destroy, обработчики событий не удаляются у instance-а.
        // https://github.com/pasaran/nommon/pull/21
    }
};

ns.Model.isValid = function(id, params) {
    return !!ns.Model.getValid(id, params);
};

/**
 * Определяет новую модель.
 * @param {String} id Название модели.
 * @param {Object} [info]
 * @param {Function} [info.ctor] Конструтор.
 * @param {Object} [info.methods] Методы прототипа.
 * @param {Object} [info.params] Параметры модели, участвующие в формировании уникального ключа.
 * @param {ns.Model} [base=ns.Model] Базовый класс для наследования
 * @examples
 * //  Простая модель, без параметров.
 * ns.Model.define('profile');
 *
 * ns.Model.define('album', {
 *   params: {
 *     //  Любое значение, кроме null расценивается как дефолтное значение этого параметра.
 *     //  На самом деле, конечно, не любое -- смысл имеют только Number и String.
 *     'author-login': null,
 *     'album-id': null,
 *
 *     //  Этим двум параметрам заданы дефолтные значения.
 *     'page': 0,
 *     'pageSize': 20
 *     }
 * });
 */
ns.Model.define = function(id, info, base) {
    ns.assert(!(id in _infos), 'ns.Model', "Can't redefine '%s'", id);

    info = info || {};

    // Model becomes ModelCollection if it has "isCollection" or "split" property
    if (typeof info.isCollection === 'undefined') {
        info.isCollection = !!info.split;
    }

    if (!base) {
        if (info.uniq) {
            base = ns.ModelUniq;
        } else if (info.isCollection) {
            base = ns.ModelCollection;
        } else {
            base = ns.Model;
        }
    }

    var ctor = info.ctor || function() {};
    // Нужно унаследоваться от base и добавить в прототип info.methods.
    ctor = no.inherit(ctor, base, info.methods);

    // часть дополнительной обработки производится в ns.Model.info
    // т.о. получаем lazy-определение

    _infos[id] = info;
    _ctors[id] = ctor;

    //  Создаем пустой кэш для всех моделей с данным id.
    _cache[id] = {};

    return ctor;
};

/**
 * Returns model's info
 * @param {String} id Model ID.
 * @returns {Object}
 * @throws Throws exception if model is not defined.
 */
ns.Model.info = function(id) {
    var info = ns.Model.infoLite(id);

    if (info && !info.ready) {
        /**
         * Параметры моделей.
         * @type {Object}
         */
        info.params = info.params || {};

        /**
         * Обработчики событий.
         * @type {Object}
         */
        info.events = info.events || {};

        /**
         * Флаг do-модели. Модель, которая изменяет данные.
         * Для do-моделей отдельные правила кэширования и построения ключей.
         * @type {Boolean}
         */
        info.isDo = /^do-/.test(id);

        info.ready = true;
    }
    return info;
};

/**
 * Returns model's info without processing.
 * @param {String} id Model ID.
 * @returns {Object}
 */
ns.Model.infoLite = function(id) {
    var info = _infos[id];
    ns.assert(info, 'ns.Model', "'%s' is not defined", id);

    return info;
};

ns.Model.key = function(id, params, info) {
    info = info || ns.Model.info(id);

    ns.assert(info, 'ns.Model', 'Unknown model type "%s"', id);

    //  Для do-моделей ключ строим особым образом.
    if (info.isDo) {
        return 'do-' + id + '-' + _keySuffix++;
    }

    var keyPrefix = 'model=' + id;
    var keyParams = ns.Model._getKeyParams(id, params, info);
    return ns.key(keyPrefix, keyParams);
};

ns.Model._getKeyParams = function(id, params, info) {
    params = params || {};
    info = info || ns.Model.info(id);

    ns.assert(info, 'ns.Model', 'Unknown model type "%s"', id);

    if (typeof info.params === 'function') {
        return info.params(params);
    }

    var defaults = info.params;
    var pNames = info.pNames || (info.pNames = Object.keys(info.params));
    var result = {};

    for (var i = 0, l = pNames.length; i < l; i++) {
        var pName = pNames[i];
        var pValue = params[pName];

        //  Нельзя просто написать params[pName] || defaults[pName] --
        //  т.к. params[pName] может быть 0 или ''.
        pValue = (pValue === undefined) ? defaults[pName] : pValue;

        if (pValue != null) {
            result[pName] = pValue;
        }
    }

    return result;
};

/**
 * Инвалидирует все модели с заданным id, удовлетворяющие filter.
 * @static
 * @param {String} id ID модели.
 * @param {Function} [filter] Функция-фильтр, принимающая параметром модель и возвращающая boolean.
 */
ns.Model.invalidate = function(id, filter) {
    filter = filter || function() { return true; };

    var models = _cache[id];

    for (var key in models) {
        var model = models[key];
        if (filter(model)) {
            model.invalidate();
        }
    }
};

/**
 * Модель должна удалиться вместе с переданными моделями.
 * @param { ns.Model } targetModel - модель, которую надо удалить при удалении связанных моделей
 * @param { ns.Model | ns.Model[] } withModels - связанные модели
 */
ns.Model.destroyWith = function(targetModel, withModels) {
    if (!Array.isArray(withModels)) {
        withModels = [ withModels ];
    }

    for (var i = 0, len = withModels.length; i < len; i++) {
        var model = withModels[i];

        ns.assert((model instanceof ns.Model), 'ns.Model', "destroyWith called for '%s' while one of the withModels is not instance of ns.Model", targetModel.id);

        // при уничтожении модели, с которой связана текущая - она тоже должна быть уничтожена
        model.on('ns-model-destroyed', function() {
            ns.Model.destroy(targetModel);
        });
    }
};

ns.Model.isCollection = function(model) {
    return (model.info || ns.Model.infoLite(model.id)).isCollection;
};

// ----------------------------------------------------------------------------------------------------------------- //

// TODO а это кто-то использует вообще? я сюда не смотрел совсем :)

/**
 * Это набор хэлперов для модели, делающего групповые запросы,
 * т.е. в качестве параметра у него есть массив
 * хэлперы позволяют каждый последующий раз искать в массиве значения,
 * которые ранее не грузились (уникальные) и грузить только их
 * @class
 * @augments ns.Model
 */
ns.ModelUniq = function() {};

no.inherit(ns.ModelUniq, ns.Model);

ns.ModelUniq.prototype.__superInit = ns.ModelUniq.prototype._init;

ns.ModelUniq.prototype._init = function(id) {
    // добавляем дефолтное событие changed
    var info = ns.Model.info(id);
    info.events.changed = info.events.changed || [];
    var onchangedCallbacks = info.events.changed;

    var cb = function() {
        //TODO: по-хорошему надо записывать все данные в один кеш и брать всегда все оттуда, а не ходить по всем экземплярам и собирать данные
        //Как только собрался кэш запоминаем какие ключи у нас есть
        var that = this;
        var uniq = this.params[this.uniqName];
        if (!this.uniqCached) { this.uniqCached = {}; }

        $.each(uniq, function(i, v) { that.uniqCached[v] = true; });
    };

    if (Array.isArray(onchangedCallbacks)) {
        onchangedCallbacks.unshift(cb);
    } else {
        info.events.changed = [cb, info.events.changed];
    }

    this.__superInit.apply(this, arguments);
};

ns.ModelUniq.prototype._superIsValid = ns.Model.prototype.isValid;
/**
 * Исходя из ключа определяет, есть ли у нас уже запрашиваемая информация
 */
ns.ModelUniq.prototype.isValid = function() {
    // если в ключе не присутсвует наш уникальный параметр
    // значит запрашивать 'ничего' не планируется,
    // а 'ничего' у нас закэшировано и так
    if (this.key.indexOf('&' + this.uniqName + '=') === -1) {
        return true;
    }
    return this._superIsValid();
};

/**
 * Имя значения в params, которое является массивом
 * @private
 * @type String
 */
ns.ModelUniq.prototype.uniqName = '';

/**
 * Название массива в кэше,
 * в котором должны храниться уникальные значения
 * @private
 * @type String
 */
ns.ModelUniq.prototype.uniqPath = '';

/**
 * Кэш с уже загруженными значениями
 * @private
 * @type Object
 */
ns.ModelUniq.prototype.uniqCached = null;

/**
 * Хэлпер, который помогает вырезать из параметров уже загруженные значения
 * @param {Object} params
 * @param {Object} cached ссылка, на объект, в который будет сложена закэшированная часть параметров
 * @type Object
 */
ns.ModelUniq.prototype.uniq = function(params, cached) {
    var that = this;
    var name = this.uniqName;
    var copy = $.extend({}, params, true);
    if (!this.uniqCached) { this.uniqCached = {}; }

    // создаём ту же структуру, что и в оригинальных параметрах
    if (cached) {
        for (var k in params) {
            cached[k] = k === name ? [] : params[k];
        }
    }

    copy[name] = $.map([].concat(copy[name]), function(v) {
        if (that.uniqCached[v]) {
            if (cached) {
                cached[name].push(v);
            }

            return null;

        } else {
            return v;
        }
    });

    if (!copy[name].length) {
        delete copy[name];
    }

    if (cached && !cached[name].length) {
        delete cached[name];
    }

    return copy;
};

/**
 * Из ключа кэша делает массив по параметру, уникальность которого достигаем
 * @private
 * @param {String} key
 * @type Array
 */
ns.ModelUniq.prototype.uniqFromKey = function(key) {
    return ((key.split(this.uniqName + '=')[1] || '').split('&')[0] || '').split(',');
};

/**
 * Вырезает из кэша xml для конкретного значения
 * @private
 * @abstract
 * @param {Node} xml
 * @param {String} uniq
 * @type Node
 */
ns.ModelUniq.prototype.uniqFromJSON = ns.todo;

/**
 * Возвращает кэш по параметрам
 * @return {*}
 */
ns.ModelUniq.prototype.getData = function(params) {
    var that = this;
    var path = this.uniqPath;
    var uniqs = [].concat(params[this.uniqName]);
    var data = {};
    data[path] = [];

    var modelsCache = _cache[this.id];
    for (var key in modelsCache) {
        var model = modelsCache[key];

        var arrKey = that.uniqFromKey(key);

        for (var i = 0, j = uniqs.length; i < j; i++) {
            // если требуемое значение есть в кэше
            if ($.inArray(uniqs[i], arrKey) > -1) {
                // извлекаем значение из кэша по ключу
                var value = that.uniqFromJSON(model.data, uniqs[i]);
                if (value) {
                    data[path].push(value);
                }
                uniqs.splice(i, 1);
                i--;
            }
        }
    }

    return data;
};

// ----------------------------------------------------------------------------------------------------------------- //

if (window['mocha']) {
    /**
     * Удаляет определение модели.
     * Используется только в юнит-тестах.
     * @param {String} [id] ID модели.
     */
    ns.Model.undefine = function(id) {
        if (id) {
            delete _cache[id];
            delete _ctors[id];
            delete _infos[id];
        } else {
            _cache = {};
            _ctors = {};
            _infos = {};
        }
    };

    ns.Model.privats = function() {
        return {
            _ctors: _ctors,
            _infos: _infos,
            _cache: _cache,
            _keySuffix: _keySuffix
        };
    };

    ns.Model.clearCaches = function(id) {
        if (id) {
            _cache[id] = {};
        } else {
            for (var key in _cache) {
                _cache[key] = {};
            }
        }
    };
}

})();
