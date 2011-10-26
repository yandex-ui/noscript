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
        no.Request.addKey(item.key); // Добавляем ключ сразу, потому как сразу же будем делать запрос данных.
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
        retries: number,                // Количество сделанных попыток получить данные.
        requestCount: number,           // Количество запросов, которые ждут ключ.
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

        var requested = no.Request.getKey(key);

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
    NOTE раньше была группировка параметров. Теперь она не делается для исключения конфликтров (к примеру,
    у модели могут быть необязательные параметры, которые явно передаются для другой модели: конфликт).

    Например:

        {
            '_models.0': 'photo',
            'user.0': 'nop',
            'photo_id.0': 42,

            '_models.1': 'photo'
            'user.1': 'nop',
            'photo_id.1': 97

            '_models.2': 'album',
            'user.2': 'mmoo',
            'album_id.2': 33
        }

    @param {no.Request.type_requestItems} items
    @return {!Object}
*/
no.Request.items2params = function(items) {
    var params = {};

    for (var i = 0, l = items.length; i < l; i++) {
        var suffix = '.' + i; // Чтобы не путать параметры с одинаковыми именами разных моделей,
                              // добавляем к именам параметров специальный суффикс.
        var item = items[i];
        item.group_id = i;

        // Каждая модель прокидывает в params все свои параметры (кроме служебных вида _<name>).
        for (var key in item.params) {
            if (!/^_/.test(key)) { // Служебные параметры (начинающиеся на '_') игнорируем.
                params[ key + suffix ] = item.params[key];
            }
        }

        // Плюс добавляется один служебный параметр _models, содержащий список запрашиваемых моделей.
        // ВАЖНО: models, потому что не сервере мы умеем вытаскивать несколько моделей из урла вида: _models=profile,fotka-view,album.
        params[ '_models' + suffix ] = item.model_id;
    }

    return params;
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

