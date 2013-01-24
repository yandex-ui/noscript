(function() {

//  ---------------------------------------------------------------------------------------------------------------  //
//  no.Model
//  ---------------------------------------------------------------------------------------------------------------  //

/**
 * @class Базовый класс для моделей. Конструктор пустой, чтобы легче было наследоваться.
 * Вся инициализация делается в _init(), который вызывает фабрикой no.Model.create().
 * @constructor
 * @namespace
 */
no.Model = function() {};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Добавляем методы из no.Events: on(), off(), trigger().
no.extend(no.Model.prototype, no.Events);

//  ---------------------------------------------------------------------------------------------------------------  //

var _ctors = {};
var _infos = {};

var _cache = {};

var _keySuffix = 0;

//  ---------------------------------------------------------------------------------------------------------------  //

/**
 * @see no.M.STATUS
 * @enum {String}
 * @borrows no.M.STATUS as no.Model.prototype.STATUS
 */
no.Model.prototype.STATUS = no.M.STATUS;

no.Model.prototype._init = function(id, params, data) {
    this.id = id;
    this.params = params;

    this._reset();

    this.info = no.Model.info(id);
    this.key = no.Model.key(id, params, this.info);

    this.setData(data);

    this._bindEvents();
};

no.Model.prototype._reset = function(status) {
    this.data = null;
    this.error = null;

    this.status = status || this.STATUS.NONE;
    this.retries = 0;

    this.timestamp = 0;
};

/**
 * Регистрирует обработчики событий.
 * @private
 */
no.Model.prototype._bindEvents = function() {
    for (var event in this.info.events) {
        var callbacks = this.info.events[event];
        // приводим обработчики к массиву
        if (!Array.isArray(callbacks)) {
            callbacks = [callbacks];
        }

        for (var i = 0, j = callbacks.length; i < j; i++) {
            // сразу биндим обработчики в this
            this.on(event, callbacks[i].bind(this));
            //NOTE: т.к. сейчас модели никак не удаляются, то и не надо снимать обработчики
        }
    }
};

/**
 * При установке data в составной моделе
 * инициализирует все составляющие модели
 */
no.Model.prototype._splitData = function(data) {
    var that = this;
    var info = this.info.split;
    var newModels = [];
    var oldModels = this.models || [];

    // нужно сохранить ссылку на callback,
    // чтобы можно было его анбиндить
    if (!this._splitData.callback) {
        this._splitData.callback = function(evt, data) {
            return that.trigger(evt, data);
        }
    }
    var callback = this._splitData.callback;

    var items = no.path(info.items, data);

    // анбиндим все старые модели
    // если они останутся в коллекции
    // мы забиндим их снова
    oldModels.forEach(function(model) {
        model.off('changed', callback);
    });

    items.forEach(function(item) {
        // собираем параметры для новой модели
        var params = {};
        for (var key in info.params) {
            params[key] = no.path(info.params[key], item);
        }

        // создаём новую модель
        // или устанавливаем новые данные для существующией
        var model = no.Model.create(info.model_id, params, item);

        // при изменении вложенной модели
        // тригерим нотификацию в модель-коллекцию
        model.on('changed', callback);

        newModels.push(model);
    });

    // сохраняем новый массив моделей коллекции
    this.models = newModels;
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  Определяем новую модель.
//
//      //  Простая модель, без параметров.
//      no.Model.define('profile');
//
//      no.Model.define('album', {
//          params: {
//              //  Любое значение, кроме null расценивается как дефолтное значение этого параметра.
//              //  На самом деле, конечно, не любое -- смысл имеют только Number и String.
//              'author-login': null,
//              'album-id': null,
//
//              //  Этим двум параметрам заданы дефолтные значения.
//              'page': 0,
//              'pageSize': 20
//          }
//      });
//
no.Model.define = function(id, info, ctor) {
    if (id in _infos) {
        throw "Model '"+ id +"' can't be redefined!";
    }

    info = info || {};

    var noModel = no.Model;
    if (info.uniq) {
        noModel = no.ModelUniq;
    }

    if (info.methods) {
        //  Нужно унаследоваться от no.Model и добавить в прототип info.models.
        ctor = no.inherits(function() {}, noModel, info.methods);
    } else {
        ctor = ctor || noModel;
    }

    // часть дополнительной обработки производится в no.Model.info
    // т.о. получаем lazy-определение

    _infos[id] = info;
    _ctors[id] = ctor;

    //  Создаем пустой кэш для всех моделей с данным id.
    _cache[id] = {};
};

//  Фабрика для моделей. Создает инстанс нужного класса и инициализирует его.
no.Model.create = function(id, params, data)  {
    params = params || {};
    // не очевидно, но тут будут созданы и key и info
    var model = no.Model.get(id, params);

    if (!model) {
        var ctor = _ctors[id];
        model = new ctor();
        model._init(id, params, data);

        no.Model.store(model);
    } else if (data) {
        //  Модель уже существует, а мы пытаемся создать такую же, но с непустой data.
        //  FIXME: Все же непонятно, что нужно делать.
        //  Может быть, нужно передавать { silent: true }?
        model.setData(data);
        /// throw Error('Model already exists');
    }

    return model;
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.Model.info = function(id) {
    var info = _infos[id];
    // если есть декларация, но еще нет pNames, то надо завершить определение Model
    if (info && !info.pNames) {
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

        info.pNames = Object.keys(info.params);

        /**
         * Флаг do-модели. Модель, которая изменяет данные.
         * Для do-моделей отдельные правила кэширования и построения ключей.
         * @type {Boolean}
         */
        info.isDo = /^do-/.test(id);

        info.isCollection = !!info.split;
    }
    return info;
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.Model.key = function(id, params, info) {
    info = info || no.Model.info(id);

    //  Для do-моделей ключ строим особым образом.
    if (info.isDo) {
        return 'do-' + _keySuffix++;
    }

    var defaults = info.params;
    var pNames = info.pNames;

    var key = 'model=' + id;

    for (var i = 0, l = pNames.length; i < l; i++) {
        var pName = pNames[i];

        var pValue = params[pName];
        //  Нельзя просто написать params[pName] || defaults[pName] --
        //  т.к. params[pName] может быть 0 или ''.
        pValue = (pValue === undefined) ? defaults[pName] : pValue;

        if (pValue != null) {
            key += '&' + pName + '=' + pValue;
        }
    }

    return key;
};

//  ---------------------------------------------------------------------------------------------------------------  //

/**
 * Инвалидирует все модели с заданным id, удовлетворяющие filter.
 * @static
 * @param {String} id ID модели.
 * @param {Function} [filter] Функция-фильтр, принимающая параметром модель и возвращающая boolean.
 */
no.Model.invalidate = function(id, filter) {
    var models = _cache[id];

    for (var key in models) {
        var model = models[key];
        if (!filter || filter(model)) {
            model.invalidate();
        }
    }
};

no.Model.prototype.invalidate = function() {
    this._reset(this.STATUS.INVALID);
};

no.Model.prototype.isValid = function() {
    return (this.status === this.STATUS.OK);
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Возвращает данные, находящиеся по пути path.
//
//      var foo = model.get('foo'); // model.data.foo.
//      var bar = model.get('foo.bar'); // model.data.foo.bar (если foo существует).
//
no.Model.prototype.get = function(path) {
    var data = this.data;
    if (data) {
        return no.path(path, data);
    }
};

/**
 * Сохраняет value по пути jpath.
 * @param {String} jpath jpath до значения.
 * @param {*} value Новое значение.
 * @param {Object} [options] Флаги.
 * @param {Boolean} [options.silent = false] Если true, то не генерируется событие о том, что модель изменилась.
 */
no.Model.prototype.set = function(jpath, value, options) {
    var data = this.data;
    if (this.status != this.STATUS.OK || !data) {
        return;
    }

    //  Сохраняем новое значение и одновременно получаем старое значение.
    var oldValue = no.path(jpath, data, value);

    if ( !( (options && options.silent) || no.object.isEqual(value, oldValue) ) ) {
        //TODO: надо придумать какой-то другой разделитель, а то получается changed..jpath
        this.trigger('changed.' + jpath, {
            'new': value,
            'old': oldValue,
            'jpath': jpath
        });
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.Model.prototype.getData = function() {
    var result = this.data;

    // если это составная модель —
    // нужно склеить все данные
    // из моделей её состовляющих
    if ( this.isCollection() ) {
        // массив с хранилищем данных моделей
        var items = no.path(this.info.split.items, this.data);
        // удаляем все старые данные
        items.splice(0, items.length);
        // пишем новые
        this.models.forEach(function(model) {
            items.push( model.getData() );
        });
    }
    return result;
};

/**
 * Устанавливает новые данные модели.
 * @param {*} data Новые данные.
 * @param {Object} [options] Флаги.
 * @param {Boolean} [options.silent = false] Если true, то не генерируется событие о том, что модель изменилась.
 */
no.Model.prototype.setData = function(data, options) {
    if (data) {
        this.data = this.preprocessData(data);

        // если это составная модель —
        // нужно нужно разбить её на модели
        if ( this.isCollection() ) {
            this._splitData(data);
        }

        this.error = null;
        this.status = this.STATUS.OK;

        //  Не проверяем здесь, действительно ли data отличается от oldData --
        //  setData должен вызываться только когда обновленная модель целиком перезапрошена.
        //  Можно считать, что она в этом случае всегда меняется.
        if (!options || !options.silent) {
            this.trigger('changed', this.key);
        }

        this.touch();
    }

};

no.Model.prototype.getError = function() {
    return this.error;
};

no.Model.prototype.setError = function(error) {
    this.data = null;
    this.error = error;
    this.status = this.STATUS.ERROR;
};

no.Model.prototype.preprocessData = function(data) {
    return data;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  FIXME: Этот код сильно пересекается с вычислением ключа.
//  Нельзя ли избавиться от копипаста?
no.Model.prototype.getRequestParams = function() {
    var params = this.params;

    var defaults = this.info.params;
    var reqParams = {};

    for (var pName in defaults) {
        var pValue = params[pName];

        pValue = (pValue === undefined) ? defaults[pName] : pValue;
        if (pValue != null) {
            reqParams[pName] = pValue;
        }
    }

    return reqParams;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Работа с кэшем.

/**
 * Возвращает модель из кеша.
 * @param {String} id Название модели.
 * @param {String|Object} key Ключ(string) или параметры(object) модели.
 * @return {no.Model}
 */
no.Model.get = function(id, key) {
    if (!(id in _infos)) {
        throw 'Model "' + id + '" is not defined!';
    }
    key = (typeof key === 'string') ? key : no.Model.key(id, key);

    return _cache[id][key];
};

//  Сохраняем модель в кэше.
no.Model.store = function(model) {
    if ( model.isDo() ) {
        return;
    }

    var id = model.id;
    var key = model.key;

    var cached = _cache[id][key];
    if (!cached) {
        _cache[id][key] = model;
    } else {
        //  NOTE: Почему тут нельзя просто заменить старую модель на новую.
        //  Потому, что в этом случае все, кто был подписан на события от старой модели
        //  не смогут переподписаться на новую модель.
        cached.data = model.data;
    }
};

//  Проверяем, есть ли модель в кэше и валидна ли она.
no.Model.isValid = function(id, key) {
    var model = no.Model.get(id, key);
    if (!model) { return; } // undefined означает, что кэша нет вообще, а false -- что он инвалидный.

    return model.isValid();
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Возвращает, можно ли перезапрашивать эту модель, если предыдущий запрос не удался.
no.Model.prototype.canRetry = function(error) {
    //  do-модели нельзя перезапрашивать.
    return ( !this.isDo() && this.retries < 3 );
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.Model.prototype.extractData = function(result) {
    if (result) {
        return result.data;
    }
};

no.Model.prototype.extractError = function(result) {
    if (result) {
        return result.error;
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.Model.prototype.isDo = function() {
    return this.info.isDo;
};

no.Model.prototype.isCollection = function() {
    return this.info.isCollection;
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.Model.prototype.touch = function() {
    this.timestamp = +new Date();
};

//  ---------------------------------------------------------------------------------------------------------------  //

/**
 * Подготавливает модель к запросу.
 * @param {Number} requestID ID запроса.
 * @return {no.Model}
 */
no.Model.prototype.prepareRequest = function(requestID) {
    this.requestID = requestID;
    this.retries++;
    this.promise = new no.Promise();

    return this;
};

if(window['mocha']) {
    /**
     * Удаляет определение модели.
     * Используется только в юнит-тестах.
     * @param {String} id ID модели.
     */
    no.Model.undefine = function(id) {
        delete _cache[id];
        delete _ctors[id];
        delete _infos[id];
    };

    no.Model.privats = {
        _ctors: _ctors,
        _infos: _infos,
        _cache: _cache,
        _keySuffix: _keySuffix
    };
}


/**
 * Это набор хэлперов для модели, делающего групповые запросы,
 * т.е. в качестве параметра у него есть массив
 * хэлперы позволяют каждый последующий раз искать в массиве значения,
 * которые ранее не грузились (уникальные) и грузить только их
 */
no.ModelUniq = function(){};
no.extend(no.ModelUniq.prototype, no.Model.prototype);

no.ModelUniq.prototype.__superInit = no.ModelUniq.prototype._init;

no.ModelUniq.prototype._init = function(id) {
    // добавляем дефолтное событие changed
    var info = no.Model.info(id);
    info.events.changed = info.events.changed || [];
    var onchangedCallbacks = info.events.changed;

    var cb = function() {
        //TODO: по-хорошему надо записывать все данные в один кеш и брать всегда все оттуда, а не ходить по всем экземплярам и собирать данные
        //Как только собрался кэш запоминаем какие ключи у нас есть
        var that = this;
        var uniq = this.params[this.uniqName];
        if (!this.uniqCached) { this.uniqCached = {}; }

        $.each(uniq, function(i, v){ that.uniqCached[v] = true; });
    };

    if (Array.isArray(onchangedCallbacks)) {
        onchangedCallbacks.unshift(cb);
    } else {
        info.events.changed = [cb, info.events.changed];
    }

    this.__superInit.apply(this, arguments);
};

no.ModelUniq.prototype._superIsValid = no.Model.prototype.isValid;
/**
 * Исходя из ключа определяет, есть ли у нас уже запрашиваемая информация
 */
no.ModelUniq.prototype.isValid = function() {
    // если в ключе не присутсвует наш уникальный параметр
    // значит запрашивать 'ничего' не планируется,
    // а 'ничего' у нас закэшировано и так
    if (this.key.indexOf('&' + this.uniqName + '=') == -1) {
        return true;
    }
    return this._superIsValid();
};

/**
 * Имя значения в params, которое является массивом
 * @private
 * @type String
 */
no.ModelUniq.prototype.uniqName = '';

/**
 * Название массива в кэше,
 * в котором дожны храниться уникальные значения
 * @private
 * @type String
 */
no.ModelUniq.prototype.uniqPath = '';

/**
 * Кэш с уже загруженными значениями
 * @private
 * @type Object
 */
no.ModelUniq.prototype.uniqCached = null;

/**
 * Хэлпер, который помогает вырезать из параметров уже загруженные значения
 * @param {Object} params
 * @param {Object} cached ссылка, на объект, в который будет сложена закэшированная часть параметров
 * @type Object
 */
no.ModelUniq.prototype.uniq = function(params, cached) {
    var that = this;
    var name = this.uniqName;
    var copy = $.extend({}, params, true);
    if (!this.uniqCached) { this.uniqCached = {}; }

    // создаём ту же структуру, что и в оригинальных параметрах
    if (cached) {
        for (var k in params) {
            cached[k] = k == name ? [] : params[k];
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
no.ModelUniq.prototype.uniqFromKey = function(key) {
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
no.ModelUniq.prototype.uniqFromJSON = function(xml, uniq) {
    no.todo();
};

/**
 * Возвращает кэш по параметрам
 * @return {*}
 */
no.ModelUniq.prototype.getData = function(params) {
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

})();

