(function() {

//  ---------------------------------------------------------------------------------------------------------------  //
//  no.Model
//  ---------------------------------------------------------------------------------------------------------------  //

//  Базовый класс для моделей. Конструктор пустой, чтобы легче было наследоваться.
//  Вся инициализация делается в _init(), который вызывает фабрикой no.Model.create().
//
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
 * Статус модели "Ошибка".
 * Данные загрузились с ошибкой, retry невозможен.
 * @constant
 * @type {String}
 */
no.Model.prototype.STATUS_ERROR = 'error';

/**
 * Статус модели "Неудача".
 * Данные загрузились с ошибкой, возможен retry.
 * @constant
 * @type {String}
 */
no.Model.prototype.STATUS_FAILED = 'failed';

/**
 * Статус модели "В процессе загрузки".
 * Данные загружаются в данный момент.
 * @constant
 * @type {String}
 */
no.Model.prototype.STATUS_LOADING = 'loading';

/**
 * Статус модели "Нет данных".
 * Данные еще не загружались.
 * @constant
 * @type {String}
 */
no.Model.prototype.STATUS_NONE = 'none';

/**
 * Статус модели "Все хорошо".
 * Данные загрузились успешно.
 * @constant
 * @type {String}
 */
no.Model.prototype.STATUS_OK = 'ok';

/**
 * Статус модели "Не валиден".
 * Модель вручную инвалидирована.
 * @constant
 * @type {String}
 */
no.Model.prototype.STATUS_INVALID = 'invalid';

no.Model.prototype._init = function(id, params, data) {
    this.id = id;
    this.params = params;

    this._reset();
    this.setData(data);

    var info = this.info = _infos[id];

    this.key = no.Model.key(id, params, info);

    this.timestamp = 0;
};

no.Model.prototype._reset = function(status) {
    this.data = null;
    this.error = null;

    this.status = status || this.STATUS_NONE;
    this.retries = 0;
    this.requests = 0;

    this.timestamp = 0;
};

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
    info = info || {};
    if (info.methods) {
        //  Нужно унаследоваться от no.Model и добавить в прототип info.models.
        ctor = no.inherits(function() {}, no.Model, info.methods);
    } else {
        ctor = ctor || no.Model;
    }

    var params = info.params || (( info.params = {} ));

    info.pNames = no.object.keys(params);

    //  Для do-моделей отдельные правила кэширования и построения ключей.
    info.isDo = /^do-/.test(id);

    _infos[id] = info;
    _ctors[id] = ctor;

    //  Создаем пустой кэш для всех моделей с данным id.
    _cache[id] = {};
};

//  Фабрика для моделей. Создает инстанс нужного класса и инициализирует его.
no.Model.create = function(id, params, data)  {
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
    return _infos[id];
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.Model.key = function(id, params, info) {
    info || ( info = _infos[id] );

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

//  Инвалидируем все модели с заданным id,
//  удовлетворяющие фильтру filter (функция, принимающая
//  параметром модель и возвращающая boolean).
no.Model.invalidate = function(id, filter) {
    var models = _cache[id];

    for (var key in models) {
        var model = models[key];
        if ( filter(model) ) {
            model.invalidate();
        }
    }
};

no.Model.prototype.invalidate = function() {
    this._reset(this.STATUS_INVALID);
};

no.Model.prototype.isValid = function() {
    return (this.status === this.STATUS_OK);
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

//  Сохраняет value по пути path.
//
//  Возможные флаги, которые могут быть в options:
//
//      {
//          silent: true        //  Не генерить событие о том, что модель изменилась,
//      }
//
no.Model.prototype.set = function(path, value, options) {
    var data = this.data;
    if (!data) { return; }

    //  Сохраняем новое значение и одновременно получаем старое значение.
    var oldValue = no.path(path, data, value);

    if ( !( (options && options.silent) || no.object.isEqual(value, oldValue) ) ) {
        //  FIXME: Может быть отправлять старое/новое значение?
        this.trigger('changed.' + path);
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.Model.prototype.getData = function() {
    return this.data;
};

//  Заменяет данные модели на data.
//
//  При этом по-дефолту на модели генерится событие 'changed'.
//  Это поведение можно поменять, передав объект options:
//
//      {
//          silent: true        //  Не генерить событие о том, что модель изменилась,
//      }
//
no.Model.prototype.setData = function(data, options) {
    if (data) {
        var old = this.data;
        this.data = this.preprocessData(data);
        this.error = null;
        this.status = this.STATUS_OK;

        //  Не проверяем здесь, действительно ли data отличается от oldData --
        //  setData должен вызываться только когда обновленная модель целиком перезапрошена.
        //  Можно считать, что она в этом случае всегда меняется.
        if ( old != null && !(options && options.silent) ) {
            this.trigger('changed');
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
    this.status = this.STATUS_FAILED;
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
        return result.result;
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

//  ---------------------------------------------------------------------------------------------------------------  //

no.Model.prototype.touch = function() {
    this.timestamp = +new Date();
};

//  ---------------------------------------------------------------------------------------------------------------  //

})();

