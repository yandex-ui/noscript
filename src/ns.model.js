(function() {

    /**
     * @classdesc Базовый класс для моделей. Конструктор пустой, чтобы легче было наследоваться.
     * Вся инициализация делается в _init(), который вызывает фабрикой ns.Model.get().
     * @constructor
     * @mixes ns.Events
     * @tutorial ns.model
     * @fires ns.Model#ns-model-init
     */
    ns.Model = function() {};

    //  Добавляем методы из ns.Events: on(), off(), trigger().
    no.extend(ns.Model.prototype, ns.Events);

    var _ctors = {};
    var _infos = {};

    var _cache = {};

    var _keySuffix = 0;

    /**
     * @type {ns.M.STATUS}
     * @private
     */
    ns.Model.prototype.STATUS = ns.M.STATUS;

    ns.Model.prototype.RETRY_LIMIT = 3;

    /**
     * Состояние модели.
     * @type {ns.M.STATUS}
     * @private
     */
    ns.Model.prototype.status = ns.M.STATUS.NONE;

    /**
     * Уникальный ключ модели.
     * @type {string}
     */
    ns.Model.prototype.key = null;

    /**
     * Параметры модели.
     * @type {object}
     */
    ns.Model.prototype.params = null;

    /**
     *
     * @param {string} id
     * @param {object} params
     * @private
     */
    ns.Model.prototype._init = function(id, params) {
        this.id = id;

        this._reset();

        this.info = ns.Model.info(id);
        no.extend(this, ns.Model.getKeyAndParams(id, params, this.info));

        this._reinit();
    };

    /**
     * Переинициализирует модель после #destroy() или самой первой инициализации.
     * @private
     */
    ns.Model.prototype._reinit = function() {
        if (this.status === this.STATUS.NONE) {
            this._bindEvents();
            this.status = this.STATUS.INITED;
            /**
             * Модель создана и проинициализованна.
             * @event ns.Model#ns-model-init
             */
            this.trigger('ns-model-init');
        }
    };

    /**
     * Сбрасывает состояние модели.
     * @param {ns.M.STATUS} [status=ns.M.STATUS.NONE]
     * @private
     */
    ns.Model.prototype._reset = function(status) {
        this.data = null;
        this.error = null;

        this._softReset(status);

        /**
         * Data version.
         * @type {number}
         * @protected
         */
        this._version = 0;
    };

    /**
     * Магкий сброс. Устанавливает только статус и сбрасывает retries.
     * Не удаляет данные и не сбрасывает версию.
     * @param {ns.M.STATUS} [status=ns.M.STATUS.NONE]
     * @private
     */
    ns.Model.prototype._softReset = function(status) {
        this.status = status || this.STATUS.NONE;
        this.retries = 0;
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
                this.on(event, this._prepareCallback(callbacks[i]));
            }
        }
    };

    /**
     * Убирает обработчики событий.
     * @private
     */
    ns.Model.prototype._unbindEvents = function() {
        for (var event in this.info.events) {
            var callbacks = this.info.events[event];
            // приводим обработчики к массиву
            if (!Array.isArray(callbacks)) {
                callbacks = [callbacks];
            }

            for (var i = 0, j = callbacks.length; i < j; i++) {
                this.off(event, this._prepareCallback(callbacks[i]));
            }
        }
    };

    /**
     * Ищет метод в объекте по имени или возвращает переданную функцию
     * Нужен для навешивания коллбеков
     * @param {String | Function} method
     * @returns {Function}
     * @private
     */
    ns.Model.prototype._prepareCallback = function(method) {
        if (typeof method === 'string') {
            method = this[method];
        }

        ns.assert((typeof method === 'function'), 'ns.Model', "Can't find method '%s' in '%s' to bind event", method, this.id);

        return method;
    };

    /**
     * Инвалидирует модель.
     */
    ns.Model.prototype.invalidate = function() {
        this._softReset(this.STATUS.INVALID);
    };

    /**
     * Уничтожает модель.
     * @fires ns.Model#ns-model-before-destroyed
     * @fires ns.Model#ns-model-destroyed
     */
    ns.Model.prototype.destroy = function() {
        /**
         * @events ns.Model#ns-model-before-destroyed
         */
        this.trigger('ns-model-before-destroyed');

        this._reset(this.STATUS.NONE);
        /**
         * Сообщает об уничтожении модели
         * @events ns.Model#ns-model-destroyed
         */
        this.trigger('ns-model-destroyed');
        this._unbindEvents();
    };

    /**
     *
     * @returns {boolean}
     */
    ns.Model.prototype.isValid = function() {
        return (this.status === this.STATUS.OK);
    };

    /**
     *
     * @returns {null|*}
     */
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
     * @param {string} jpath jpath до значения.
     * @param {*} value Новое значение.
     * @param {ns.Model~setOptions} [options] Флаги.
     * @fires ns.Model#ns-model-changed
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

        options = options || {};
        options.jpath = jpath;
        this.touch(options);

        if (options.silent) {
            return;
        }

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
     * @param {ns.Model~setOptions} [options] Флаги.
     * @returns {ns.Model}
     * @fires ns.Model#ns-model-changed
     */
    ns.Model.prototype.setData = function(data, options) {
        // переинициализация после #destroy()
        this._reinit();

        if (data && (!this.isValid() || this.hasDataChanged(data))) {

            /**
             * Данные модели.
             * @description
             * Это свойство нельзя использовать напрямую,
             * т.к. там могут быть неактуальные или неправильные данные
             * @private
             * @type {*}
             */
            this.data = this._beforeSetData(this.preprocessData(data), options);

            this.status = this.STATUS.OK;
            this.error = null;

            this.touch(options);
        }

        return this;
    };

    /**
     *
     * @param {*} data
     * @returns {boolean}
     */
    ns.Model.prototype.hasDataChanged = function(data) {
        return !!data;
    };

    /**
     *
     * @returns {*}
     */
    ns.Model.prototype.getError = function() {
        return this.error;
    };

    /**
     *
     * @param {*} error
     */
    ns.Model.prototype.setError = function(error) {
        this.data = null;
        this.error = error;
        this.status = this.STATUS.ERROR;
    };

    /**
     *
     * @param {*} data
     * @returns {*}
     * @private
     */
    ns.Model.prototype._beforeSetData = function(data) {
        return data;
    };

    /**
     *
     * @param {*} data
     * @returns {*}
     */
    ns.Model.prototype.preprocessData = function(data) {
        return data;
    };

    /**
     *
     * @returns {object}
     */
    ns.Model.prototype.getRequestParams = function() {
        return ns.Model._getKeyParams(this.id, this.params, this.info);
    };

    /**
     * Возвращает, можно ли запрашивать / перезапрашивать модель.
     * @returns {boolean}
     */
    ns.Model.prototype.canRequest = function() {
        //  do-модели нельзя перезапрашивать.
        return !this.retries || !this.isDo() && this.retries < this.RETRY_LIMIT;
    };

    /**
     *
     * @param {*} result
     * @returns {*}
     */
    ns.Model.prototype.extractData = function(result) {
        if (result) {
            return result.data;
        }
    };

    /**
     *
     * @param {*} result
     * @returns {*}
     */
    ns.Model.prototype.extractError = function(result) {
        if (result) {
            return result.error;
        }
    };

    /**
     *
     * @returns {boolean}
     */
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

    ns.Model.prototype._incVersion = function() {
        this._version++;
    };

    /**
     * Инкрементирует версию модели.
     * @fires ns.Model#ns-model-touched
     * @fires ns.Model#ns-model-changed
     */
    ns.Model.prototype.touch = function(options) {
        options = options || {};

        if (options.silent) {
            return;
        }

        this._incVersion();

        /**
         * Событие сообщает об инкрементации версии модели.
         * @event ns.Model#ns-model-touched
         */
        this.trigger('ns-model-touched');

        var jpath = options.jpath || '';

        /**
         * Сообщение о том, что модель изменилась.
         * @event ns.Model#ns-model-changed
         * @param {string} evt Название события
         * @params {string} jpath JPath, по которому изменились данные. Если пустой, то изменилась вся модель.
         */
        this.trigger('ns-model-changed', jpath);
    };

    /**
     * Подготавливает модель к запросу.
     * @param {number} requestID ID запроса.
     * @returns {ns.Model}
     */
    ns.Model.prototype.prepareRequest = function(requestID) {
        this.requestID = requestID;
        this.retries++;
        this.promise = new Vow.Promise();

        return this;
    };

    /**
     *
     * @param {ns.Model[]} models
     */
    ns.Model.prototype.destroyWith = function(models) {
        ns.Model.destroyWith(this, models);
    };

    /**
     * Models factory. Returns cached instance or creates new.
     * @static
     * @param {string} id Model's ID.
     * @param {object} [params] Model's params.
     * @returns {ns.Model}
     */
    ns.Model.get = function(id, params) {
        var model = this._find(id, params);

        if (!model) {
            var Ctor = _ctors[id];
            model = new Ctor();
            model._init(id, params);

            // сохраняем модели в кеш, за исключение do-моделей
            if ( !model.isDo() ) {
                _cache[ id ][ model.key ] = model;
            }
        }

        model._reinit();

        return model;
    };

    /**
     * Returns valid cached model instance.
     * @param {string} id Model's ID.
     * @param {object} [params] Model's params
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
     * @param {string} id Model's ID.
     * @param {object} [params] Model's params
     * @returns {ns.Model|null}
     * @private
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
            model.destroy();
        }
    };

    /**
     *
     * @param {string} id
     * @param {object} params
     * @returns {boolean}
     */
    ns.Model.isValid = function(id, params) {
        return !!ns.Model.getValid(id, params);
    };

    /**
     * Определяет новую модель.
     * @param {string} id Название модели.
     * @param {object} [info]
     * @param {Function} [info.ctor] Конструтор.
     * @param {object} [info.methods] Методы прототипа.
     * @param {object} [info.params] Параметры модели, участвующие в формировании уникального ключа.
     * @param {ns.Model|String} [base=ns.Model] Базовый класс для наследования или название ранее объявленной модели.
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

        var baseClass = base;
        if (typeof base === 'string') {
            // если указана строка, то берем декларацию ns.Model
            baseClass = _ctors[base];
            ns.assert(baseClass, 'ns.Model', "Can't find '%s' to extend '%s'", base, id);

        } else if (!base) {
            // если не указан, то определяем базовый класс из info
            if (info.uniq) {
                baseClass = ns.ModelUniq;
            } else if (info.isCollection) {
                baseClass = ns.ModelCollection;
            } else {
                baseClass = ns.Model;
            }
        }

        var ctor = info.ctor || function() {};
        // Нужно унаследоваться от base и добавить в прототип info.methods.
        ctor = no.inherit(ctor, baseClass, info.methods);

        /**
         * Флаг, что info уже подготовили
         * @type {boolean}
         */
        info.ready = false;

        // часть дополнительной обработки производится в ns.Model.info
        // т.о. получаем lazy-определение

        _infos[id] = info;
        _ctors[id] = ctor;

        //  Создаем пустой кэш для всех моделей с данным id.
        _cache[id] = {};

        return ctor;
    };

    /**
     * Устанавливает модели в начальное состояние
     * @private
     */
    ns.Model._reset = function() {
        _cache = {};
        _ctors = {};
        _infos = {};
    };

    /**
     * Удаляет экземпляры моделей
     * @private
     */
    ns.Model._clear = function() {
        for (var id in _infos) {
            _cache[id] = {};
        }
    };

    /**
     * Returns model's info
     * @param {string} id Model ID.
     * @returns {object}
     * @throws Throws exception if model is not defined.
     */
    ns.Model.info = function(id) {
        var info = ns.Model.infoLite(id);

        if (!info.ready) {
            /**
             * Параметры моделей.
             * @type {object}
             */
            info.params = info.params || {};

            /**
             * Обработчики событий.
             * @type {object}
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
     * @param {string} id Model ID.
     * @returns {object}
     */
    ns.Model.infoLite = function(id) {
        var info = _infos[id];
        ns.assert(info, 'ns.Model', "'%s' is not defined", id);

        return info;
    };

    /**
     *
     * @param {string} id
     * @param {object} params
     * @param {object} [info]
     * @returns {string}
     * @static
     */
    ns.Model.key = function(id, params, info) {
        return ns.Model.getKeyAndParams(id, params, info).key;
    };

    /**
     * Возвращает ключ и собственные параметры модели.
     * @param {string} id
     * @param {object} params
     * @param {object} [info]
     * @returns {object}
     * @static
     */
    ns.Model.getKeyAndParams = function(id, params, info) {
        info = info || ns.Model.info(id);

        //  Для do-моделей ключ строим особым образом.
        if (info.isDo) {
            return {
                key: 'do-' + id + '-' + _keySuffix++,
                params: params
            };
        }

        var keyPrefix = 'model=' + id;
        var keyParams = ns.Model._getKeyParams(id, params, info);

        return {
            key: ns.key(keyPrefix, keyParams),
            params: keyParams
        };
    };

    /**
     *
     * @param {string} id
     * @param {object} params
     * @param {object} info
     * @returns {*}
     * @private
     */
    ns.Model._getKeyParams = function(id, params, info) {
        params = params || {};
        info = info || ns.Model.info(id);

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

        // динамическая доработа параметров напильником
        if ('function' === typeof info.paramsRewrite) {
            result = info.paramsRewrite(result);
        }

        return result;
    };

    /**
     * Инвалидирует все модели с заданным id, удовлетворяющие filter.
     * @static
     * @param {string} id ID модели.
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

    /**
     *
     * @param {ns.Model} model
     * @returns {boolean}
     */
    ns.Model.isCollection = function(model) {
        return (model.info || ns.Model.infoLite(model.id)).isCollection;
    };

    /**
     * Проходит по всем инстансам модели и передаёт их в callback.
     * @param {string} id идентификатор модели
     * @param {Function} callback
     */
    ns.Model.traverse = function(id, callback) {
        // вызов infoLite нужен, чтобы бросить ошибку в случае, если модель не определена
        ns.Model.infoLite(id);
        ns.assert(('function' === typeof callback), 'ns.Model.traverse', 'callback must be a function');

        var models = _cache[id];

        for (var key in models) {
            callback(models[key]);
        }
    };

    /**
     * Опции изменения модели.
     * @typedef {object} ns.Model~setOptions
     * @property {boolean} [silent = false] Не генерировать событие об изменении (ns-model-changed).
     * @property {string} [jpath] jpath, по которому произошло изменение
     */

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

            uniq.forEach(function(i, v) { that.uniqCached[v] = true; });
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
     * @param {object} params
     * @param {object} cached ссылка, на объект, в который будет сложена закэшированная часть параметров
     * @type Object
     */
    ns.ModelUniq.prototype.uniq = function(params, cached) {
        var that = this;
        var name = this.uniqName;
        var copy = no.extend({}, params);
        if (!this.uniqCached) { this.uniqCached = {}; }

        // создаём ту же структуру, что и в оригинальных параметрах
        if (cached) {
            for (var k in params) {
                cached[k] = k === name ? [] : params[k];
            }
        }

        copy[name] = [].concat(copy[name]).map(function(v) {
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
     * @param {string} key
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
     * @param {string} uniq
     * @type Node
     */
    ns.ModelUniq.prototype.uniqFromJSON = ns.todo;

    /**
     * Возвращает кэш по параметрам
     * @returns {*}
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
                if (arrKey.indexOf(uniqs[i]) > -1) {
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

})();
