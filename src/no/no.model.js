//  ---------------------------------------------------------------------------------------------------------------  //
//  no.Model
//  ---------------------------------------------------------------------------------------------------------------  //


// Typedefs.

/**
    Конструктор модели.

    @typedef {function(
        new:no.Model,
        string,
        Object,
        Object=
    )}
*/
no.Model.type_ctor;

/**
    Объект, описывающий модель.

    @typedef {{
        id: string,
        params: Object
    }}
*/
no.Model.type_info;

//  ---------------------------------------------------------------------------------------------------------------  //

/**
    Базовый класс для моделей. Конструктор пустой, чтобы легче было наследоваться.
    Вся инициализация делается в init(), который вызывает фабрикой no.Model.create().

    @constructor
*/
no.Model = function() {};

//  ---------------------------------------------------------------------------------------------------------------  //

/**
    Хранилище конструкторов моделей.
    @type { Object.<string, no.Model.type_ctor> }
*/
no.Model._ctors = {};

/**
    Хранилище описаний моделей.
    @type { Object.<string, no.Model.type_info> }
*/
no.Model._infos = {};

//  Инкрементальный счетчик, используется для построения ключей do-моделей.
no.Model._keySuffix = 0;

//  Кэш, где хранятся все существующие модели.
no.Model._cache = {};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Добавляем методы из no.Events: on(), off(), trigger().
no.extend(no.Model.prototype, no.Events);

//  ---------------------------------------------------------------------------------------------------------------  //

/**
    @param {string} id
    @param {Object} params
    @param {Object=} data
*/
no.Model.prototype.init = function(id, params, data) {
    this.id = id;
    this.params = params;

    this._reset();
    this.setData(data);

    var info = this.info = no.Model._infos[id];

    this.key = no.Model.key(id, params, info);
};

/**
    @private
*/
no.Model.prototype._reset = function() {
    this.data = null;
    this.error = null;
    /*
        Возможные варианты status:

            'none'          данные еще не загружались
            'loading'       данные загружаются в данный момент
            'failed'        данные загрузились с ошибкой, нужен retry
            'error'         данные загрузились с ошибкой, retry невозможен
            'ok'            данные загрузились успешно
    */
    this.status = 'none';
    this.retries = 0;
    this.requests = 0;
};

//  ---------------------------------------------------------------------------------------------------------------  //

/**
    Определяем новую модель.

        //  Простая модель, без параметров.
        no.Model.define('profile');

        no.Model.define({
            id: 'album',
            params: {
                //  Любое значение, кроме null расценивается как дефолтное значение этого параметра.
                //  На самом деле, конечно, не любое -- смысл имеют только Number и String.
                'author-login': null,
                'album-id': null,

                //  Этим двум параметрам заданы дефолтные значения.
                'page': 0,
                'pageSize': 20
            }
        });

    @param {string | no.Model.type_info} info
    @param {no.Model.type_ctor=} ctor
*/
no.Model.define = function(info, ctor) {
    if (typeof info === 'string') {
        info = {
            'id': info
        };
    }
    ctor = ctor || no.Model;

    var params = info.params = info.params || {};

    //  Отсортированные ключи нужны для того,
    //  чтобы в ключе параметры были всегда в одной и той же последовательности.
    info.keysOrder = no.object.keys(params).sort();

    var id = info.id;

    //  Для do-моделей отдельные правила кэширования и построения ключей.
    info.isDo = /^do-/.test(id);

    no.Model._infos[id] = info;
    no.Model._ctors[id] = ctor;

    //  Создаем пустой кэш для всех моделей с данным id.
    no.Model._cache[id] = {};
};

/**
    Фабрика для моделей. Создает инстанс нужного класса и инициализирует его.

    @param {string} id
    @param {Object} params
    @param {Object=} data
    @return {no.Model}
*/
no.Model.create = function(id, params, data) {
    var ctor = no.Model._ctors[id];

    var model = new ctor();
    model.init(id, params, data);

    return model;
};

//  ---------------------------------------------------------------------------------------------------------------  //

/**
    @param {string} id
    @return {no.Model.type_info}
*/
no.Model.info = function(id) {
    return no.Model._infos[id];
};

//  ---------------------------------------------------------------------------------------------------------------  //

/**
    @param {string} id
    @param {!Object} params
    @param {no.Model.type_info=} info
    @return {string}
*/
no.Model.key = function(id, params, info) {
    info || ( info = no.Model._infos[id] );

    //  Для do-моделей ключ строим особым образом.
    if (info.isDo) {
        return 'do-' + no.Model._keySuffix++;
    }

    var defaults = info.params;
    var keysOrder = info.keysOrder;

    var key = 'model=' + id;

    for (var i = 0, l = keysOrder.length; i < l; i++) {
        var pName = keysOrder[i];

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

no.Model.prototype.isValid = function() {
    return (this.status === 'ok');
};

//  ---------------------------------------------------------------------------------------------------------------  //

/**
    Возвращает данные, находящиеся по пути path.

        var foo = model.get('foo'); // model.data.foo.
        var bar = model.get('foo.bar'); // model.data.foo.bar (если foo существует).

    @param {string} path
*/
no.Model.prototype.get = function(path) {
    var data = this.data;
    if (data) {
        return no.path.get(path, data);
    }
};

/**
    Сохраняет value по пути path.

    Возможные флаги, которые могут быть в options:

        {
            silent: true        //  Не генерить событие о том, что модель изменилась,
        }

*/
no.Model.prototype.set = function(path, value, options) {
    var data = this.data;
    if (!data) { return; }

    options = options || {};

    //  Сохраняем новое значение и одновременно получаем старое значение.
    var oldValue = no.path(path, data, value);

    if ( !( options.silent || no.object.isEqual(value, oldValue) ) ) {
        this.trigger('changed.' + path);
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.Model.prototype.getData = function() {
    return this.data;
};

/**
    Заменяет данные модели на data.

    При этом по-дефолту на модели генерится событие 'changed' и обновляется ее timestamp.
    Это поведение можно поменять, передав объект options.
    Возможные флаги, которые могут быть в options:

        {
            silent: true        //  Не генерить событие о том, что модель изменилась,
            notouch: true       //  Не обновлять timestamp модели.
        }

    @param {*} data
    @param {Object=} options
*/
no.Model.prototype.setData = function(data, options) {
    options || ( options = {} );

    this.data = this.preprocessData(data);
    this.error = null;
    this.status = 'ok';

    //  Не проверяем здесь, действительно ли data отличается от oldData --
    //  setData должен вызываться только когда обновленная модель целиком перезапрошена.
    //  Можно считать, что она в этом случае всегда меняется.
    if (!options.silent) {
        this.trigger('changed');
    }

    if (!options.notouch) {
        this.timestamp = +new Date();
    }

};

no.Model.prototype.setError = function(error) {
    this.data = null;
    this.error = error;
    this.status = 'failed';
};

no.Model.prototype.preprocessData = function(data) {
    return data;
};

//  ---------------------------------------------------------------------------------------------------------------  //

/**
    @returns {Object=}  null в случае, когда данной модели недостаточно параметров для запроса данных.
                        Объект с параметрами для запроса модели, если для запроса модели имеются все необходимые параметры.
*/
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

no.Model.prototype.touch = function(timestamp) {
    this.timestamp = timestamp || ( +new Date() );
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Работа с кэшем.

/**
    Достаем модель из кэша.

    @param {string} id          id модели.
    @param {string|Object} key  key или params.
    @return {no.Model}          Возвращает соответствующую модель или null.
*/
no.Model.get = function(id, key) {
    key = (typeof key === 'string') ? key : no.Model.key(id, key);

    return no.Model._cache[id][key] || null;
};

/**
    Сохраняем модель в кэше.

    @param {no.Model} model
*/
no.Model.cache = function(model) {
    if ( model.isDo() ) {
        return;
    }

    var id = model.id;
    var key = model.key;

    var cache = no.Model._cache[id];

    var cached = cache[key];
    if (!cached) {
        cache[key] = model;
    } else {
        //  NOTE: Почему тут нельзя просто заменить старую модель на новую.
        //  Потому, что в этом случае все, кто был подписан на события от старой модели
        //  не смогут переподписаться на новую модель.
        cached.data = model.data;
    }
};

/**
    Очищает кэш моделей с данным id:

        //  Удаляем конкретную модель (с заданным ключом).
        no.Model.clear('photo', '...');

        //  Удаляем несколько моделей по заданному фильтру.
        no.Model.clear('photo', function(model) {
            return model.params['author-id'] === 'nop';
        });

        //  Удаляем все модели определенного типа:
        no.Model.clear('photo');

    @param {string} id
    @param {(string|function(no.Model):boolean)=} key
*/
no.Model.uncache = function(id, key) {
    if (key) {
        if (typeof key === 'string') {
            delete no.Model._cache[id][key];
        } else {
            var models = no.Model._cache[id];
            for (var k in models) {
                if ( key( models[k] ) ) {
                    delete models[k];
                }
            }
        }
    } else {
        no.Model._cache[id] = {};
    }
};

/**
    Проверяем, есть ли модель в кэше и валидна ли она.

    @param {string} id
    @param {string|Object} key
    @return {(boolean|undefined)}
*/
no.Model.isValid = function(id, key) {
    var model = no.Model.get(id, key);
    if (!model) { return; } // undefined означает, что кэша нет вообще, а false -- что он инвалидный.

    return model.isValid();
};

//  ---------------------------------------------------------------------------------------------------------------  //

/**
    Возвращает, можно ли перезапрашивать эту модель, если предыдущий запрос не удался.

    @return {boolean}
*/
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

no.Model.prototype.isDo = function() {
    return this.info.isDo;
};

