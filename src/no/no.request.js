// ----------------------------------------------------------------------------------------------------------------- //
// no.request
// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {no.Request.type_requestItems} items
    @param {function()=} callback
    @return {no.Request}
*/
no.request = function(items, callback) {
    var request = new no.Request(items);
    if (callback) {
        request.promise().then(callback);
    }
    return request;
};

// ----------------------------------------------------------------------------------------------------------------- //
// no.Request
// ----------------------------------------------------------------------------------------------------------------- //

/**
    @private
    @constructor
    @param {no.Request.type_requestItems} items
*/
no.Request = function(items) {
    this.id = no.Request.id++;
    this.items = items;

    this._promise = new no.Promise();

    for (var i = 0, l = items.length; i < l; i++) {
        var item = items[i];

        var model = no.Model.get( item.model_id );

        var params = item.params;
        params['_item_id'] = no.Request.item_id++; // Этот параметр предполагается использовать для построения ключа do-моделей,
                                                    // чтобы можно было сделать одновременно несколько одинаковых do-запросов.
        item.key = model.getKey(params);
    }

    this.request();
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @return {no.Promise}
*/
no.Request.prototype.promise = function() {
    return this._promise;
};

// ----------------------------------------------------------------------------------------------------------------- //

// Typedefs and constants.

/**
    Структура, описывающая запрос к одной модели.

        {
            model_id: 'fotka-view',   // id модели.
            params: {                   // параметры, передаваемые модели.
                id: 42
            },
            force: true                 // необязательный параметр, указывающий на принудительный сброс кэша, если он есть.
        }

    @typedef {{
        model_id: string,
        params: !Object,
        force: (boolean|undefined)
    }}
*/
no.Request.type_requestItem;

/**
    Полный запрос состоит из массива структур requestItem:

        [
            {
                model_id: 'auth',
                params: {},
            },
            {
                model_id: 'fotka-view',
                params: {
                    id: 42
                },
                force: true
            },
            {
                model_id: 'fotka-view',
                params: {
                    id: 97
                }
            }
        ]

    @typedef {Array.<no.Request.type_requestItem>}
*/
no.Request.type_requestItems;

/**
    @typedef {{
        model_ids: Array.<string>,
        params: !Object
    }}
*/
no.Request.type_requestGroup;

/**
    @typedef {Array.<no.Request.type_requestGroup>}
*/
no.Request.type_requestGroups;

/**
    @enum {number}
*/
no.Request.keyStatus = {
    NONE: 0,    // Ключ еще не загружался.
    LOADING: 1, // Ключ в процессе загрузки. Ожидаем ответа от сервера.
    ERROR: 2,   // Ключ был запрошен, но ответ содержит ошибку или же в ответе ключа не было вовсе (что тоже ошибка).
    OK: 3       // Ключ успешно получен.
};

/**
    @typedef {{
        promise: no.Promise,
        retries: number,
        requestCount: number,
        status: no.Request.keyStatus,
        request_id: (number|undefined)
    }}
*/
no.Request.type_keyInfo;

// ----------------------------------------------------------------------------------------------------------------- //

/** @type {number} */
no.Request.id = 0;

/** @type {number} */
no.Request.item_id = 0;

// ----------------------------------------------------------------------------------------------------------------- //

/**
    Хранилище запрошенных в данный момент ключей.
    Если ключ запрашивается повторно во время ожидания первого ответа, второй запрос не делается.

    @type {Object.<string, no.Request.type_keyInfo>}
*/
no.Request.keys = {};

/**
    Получаем ключ из хранилища.

    @param {string} key
    @return {no.Request.type_keyInfo}
*/
no.Request.getKey = function(key) {
    return no.Request.keys[key];
};

/**
    Добавляем ключ в хранилище.

    @param {string} key
    @return {no.Request.type_keyInfo}
*/
no.Request.addKey = function(key) {
    var info = no.Request.keys[key];

    if (!info) {
        info = no.Request.keys[key] = {
            promise: new no.Promise(),
            retries: 0,
            requestCount: 0,
            status: no.Request.keyStatus.NONE
        };
    }

    info.requestCount++; // Число реквестов, ждущих этот ключ.

    return info;
};

/**
    Помечаем, что один из запросов больше не ожидает этот ключ.
    Удаляем ключ из хранилища, если он никому больше не нужен.

    @type {string} key
*/
no.Request.doneKey = function(key) {
    var info = no.Request.keys[key];

    if (!--info.requestCount) { // Это был последний запрос, ожидающий этот ключ.
        delete no.Request.keys[key]; // Удаляем ключ из хранилища.
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

no.Request.prototype.request = function() {
    var r_promises = [];
    var r_items = this.requestedItems = [];

    var items = this.items;
    for (var i = 0, l = items.length; i < l; i++) {
        var item = items[i];

        var key = item.key;
        var model = no.Model.get( item.model_id );

        if ( !item.force && model.isCached(key) ) { // Ключ уже в кэше и не передан флаг force.
            continue;
        }

        requested = no.Request.addKey(key);

        var status = requested.status;
        if (status === no.Request.keyStatus.OK) {
            // Do nothing.

        } else if (status === no.Request.keyStatus.LOADING && !item.force) {
            r_promises.push( requested.promise ); // Подписываемся на уведомление о получении ответа.

        } else {
            // Проверяем, нужно ли (можно ли) запрашивает этот ключ.
            if ( requested.status === no.Request.keyStatus.ERROR && !( model.needRetry(requested.error) && (requested.retries < model.info.retries) ) ) {
                continue; // Превышен лимит перезапросов или же модель говорит, что с такой ошибкой перезапрашивать ключ не нужно.
            }

            requested.retries++;
            requested.request_id = this.id; // Выставляем ключу минимальный request_id, который будет засчитан в качестве ответа.
                                            // Например, мы запросили ключ, а затем (пока первый ответ еще не пришел) запросили его еще раз с флагом force.
                                            // В этом случае, первый ответ не нужно учитывать.
            requested.status = no.Request.keyStatus.LOADING; // Ключ будет (пере)запрошен.

            r_items.push( item );
        }
    }

    var promises = [];

    var l = r_items.length;
    if (l) {
        var params = no.Request.items2params(r_items);
        promises.push( no.http('/models/', params) ); // FIXME: Урл к серверной ручке.
    }

    if (r_promises.length) {
        promises.push( no.Promise.wait(r_promises) );
    }

    if (promises.length) { // Либо нужно запросить какие-то ключи, либо дождаться ответа от предыдущих запросов.
        var that = this;
        no.Promise.wait( promises ).then( function(r) { // В r должен быть массив из одного или двух элементов.
                                                        // Если мы делали http-запрос, то в r[0] должен быть его результат.
            if (l) { // Мы на самом деле делали http-запрос.
                that.extractData(r[0]);
            }
            that.request(); // "Повторяем" запрос. Если какие-то ключи не пришли, они будут перезапрошены.
                            // Если же все получено, то будет выполнен метод done().
        } );

    } else {
        this.done();
    }

};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    Вычисляем query-параметры запроса.

    Например, для реквеста, указанного в комментариях к no.Request.items2groups параметры будут такие:

        {
            '_model.0': 'photo,album',
            'user.0': 'nop',
            'photo_id.0': 42,
            'album_id.0': 66,

            '_model.1': 'photo'
            'user.1': 'nop',
            'photo_id.1': 97

            '_model.2': 'album',
            'user.2': 'mmoo',
            'album_id.2': 33
        }

    @param {no.Request.type_requestItems} items
    @return {!Object}
*/
no.Request.items2params = function(items) {
    var groups = no.Request.items2groups(items); // Группируем item'ы.

    var params = {};

    for (var i = 0, l = groups.length; i < l; i++) {
        var group = groups[i];

        var suffix = '.' + i; // Чтобы не путать параметры с одинаковыми именами из разных групп,
                              // добавляем к именам параметров специальный суффикс.

        // Каждая группа прокидывает в params все свои параметры.
        for (var key in group.params) {
            if (!/^_/.test(key)) { // Служебные параметры (начинающиеся на '_') игнорируем.
                params[ key + suffix ] = group.params[key];
            }
        }

        // Плюс добавляется один служебный параметр _model, содержащий список всех моделей этой группы.
        params[ '_models' + suffix ] = group.model_ids.join(',');

    }

    return params;
};

/**
    Группируем item'ы на основе "совместимости параметров".
    Если параметры двух подряд идущих item'а не конфликтуют (т.е. в них нет параметров в одинаковыми именами,
    но разными значениями), то они попадают в одну группу.

        [
            {
                model_id: 'photo',
                params: {
                    user: 'nop',
                    photo_id: 42
                }
            }, // группа 0

            {
                model_id: 'album',
                params: {
                    user: 'nop',
                    album_id: 66
                }
            }, // также группа 0, т.к. параметры можно смержить в один объект.

            {
                model_id: 'photo',
                params: {
                    user: 'nop',
                    photo_id: 97
                }
            }, // группа 1, т.к. в группе 0 уже есть модель photo.

            {
                model_id: 'album',
                params: {
                    user: 'mmoo',
                    album_id: 33
                }
            } // группа 2, т.к. в предыдущем item'е есть параметр user и он отличается от текущего.
        ]

    @param {no.Request.type_requestItems} items
    @return {no.Request.type_requestGroups}
*/
no.Request.items2groups = function(items) {
    var groups = [];

    var models = {};
    var params = {};
    var id = 0;

    function add(item, _params) {
        if (!models) {
            models = {};
        }

        item.group_id = id;

        models[ item.model_id ] = true;
        params = _params;
    }

    function close() {
        if (models) {
            groups.push({
                model_ids: no.object.keys( models ),
                params: params
            });
            id++;
            models = null;
            params = {};
        };
    }

    for (var i = 0, l = items.length; i < l; i++) {
        var item = items[i];

        var merged = no.Request.mergeParams( params, item.params );

        if ( merged && !models[ item.model_id ] ) {
            add( item, merged );
        } else {
            close();
            add( item, item.params );
        }
    }
    if (!no.object.isEmpty(models)) {
        close();
    }

    return groups;
};

/**
    Пытаемся смержить два объекта. Если для какого-то ключа возникает конфликт
    (т.е. значение с этим ключом в to есть и не совпадает со значением в from), то возвращаем null.

    @param {!Object} to
    @param {!Object} from
    @return {Object}
*/
no.Request.mergeParams = function(to, from) {
    var o = {};

    for (var key in from) {
        if (key.charAt(0) === '_') { // Не учитывать служебные параметры при merge'е объектов.
            continue;
        }

        var toValue = to[key];
        var fromValue = from[key];

        if (toValue === undefined || toValue === fromValue) {
            o[key] = fromValue;
        } else {
            return null;
        }
    }

    return o;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    Извлекаем данные моделей из ответа и раскладываем их в кэши.

    @param {Object} result
*/
no.Request.prototype.extractData = function(result) {
    var items = this.items;

    var timestamp = +new Date();

    for (var i = 0, l = items.length; i < l; i++) {
        var item = items[i];

        var key = item.key;
        var requested = no.Request.getKey(key);

        if (!requested || this.id < requested.request_id) { // После этого запроса был послан еще один и мы ожидаем ответа от него.
                                                            // Этот ключ игнорируем.
            continue;
        }

        var data;
        var group = result[ item.group_id ];
        if (group) {
            data = group[ item.model_id ];
        }

        var model = no.Model.get( item.model_id );

        var isError;
        if (data) {
            isError = model.hasErrors(data);
        } else {
            isError = true;
            data = {
                id: 'NO_DATA',
                reason: 'Server returned no data'
            }
        }

        requested.data = data;
        if (isError) {
            requested.status = no.Request.keyStatus.ERROR;
        } else {
            model.setCache(item.key, data, item.params, timestamp);
            requested.promise.resolve();
            requested.status = no.Request.keyStatus.OK; // FIXME: А не должен ли requested удалиться в этот же момент?
        }
    }
};

/**
*/
no.Request.prototype.done = function() {
    /// var items = this.items;
    var items = this.requestedItems;

    // var result = this.buildResult();

    for (var i = 0, l = items.length; i < l; i++) {
        no.Request.doneKey( items[i].key );
    }

    // this._promise.resolve(result);
    this._promise.resolve();
};

/**
    @return {Array.<{ error: (Object|undefined), data: (Object|undefined) }>}
*/
/*
// FIXME: Кажется, не нужно этот результат никуда возвращать. Он и так уже в кэшах лежит.
no.Request.prototype.buildResult = function() {
    var result = [];

    var items = this.items;
    for (var i = 0, l = items.length; i < l; i++) {
        var item = items[i];
        var requested = no.Request.getKey( item.key );

        result[i] = requested.data;
    }

    return result;
};
*/

