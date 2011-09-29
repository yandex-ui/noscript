// ----------------------------------------------------------------------------------------------------------------- //
// no.Request
// ----------------------------------------------------------------------------------------------------------------- //

/**
    @constructor
    @param {no.Request.type_requestItems} items
*/
no.Request = function(items) {
    this.id = no.Request._id++;
    this.items = items;

    this.promise = new no.Promise(); // FIXME: Может это нужно делать в методе send/request/...?

    for (var i = 0, l = items.length; i < l; i++) {
        var item = items[i];

        var params = item.params; // FIXME: А не нужно ли склонировать items.params, чтобы их не портить?

        /*
        // FIXME: А это зачем?
        params['_request_id'] = this.id;
        */

        var model = no.Model.get( item.model_id );

        // if (model instanceof no.Model.Do) { ... }
        params['_item_id'] = no.Request._item_id++; // Этот параметр предполагается использовать для построения ключа do-моделей,
                                                    // чтобы можно было сделать одновременно несколько одинаковых do-запросов.


        item.key = model.getKey(params);

        // TODO: Если это do-item, то сбросить соответствующие кэши.
        //       Например, после do_addAlbum сбрасывать albumList.
    }

    this.request();
};

no.Request.prototype.cancel = function() { // FIXME: Нужно ли это?
    // Что-то там...
};

// ----------------------------------------------------------------------------------------------------------------- //

// Typedefs:

/**
    Структура, описывающая запрос к одному хэндлеру.

        {
            model_id: 'fotka-view',   // id хэндлера.
            params: {                   // параметры, передаваемые хэндлеру.
                id: 42
            },
            force: true                 // необязательный параметра, указывающий на принудительный сборс кэша, если он есть.
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
    @typedef {{
        promise: no.Promise,
        retries: number,
        requestCount: number,
        status: ?(boolean|undefined),
        request_id: (number|undefined)
    }}
*/
no.Request.type_keyInfo;

// ----------------------------------------------------------------------------------------------------------------- //

/** @type {number} */
no.Request._id = 0;

/** @type {number} */
no.Request._item_id = 0;

// ----------------------------------------------------------------------------------------------------------------- //

/**
    Хранилище запрошенных в данный момент ключей.
    Если ключ запрашивается повторно во время ожидания первого ответа, второй запрос не делается.

    @type {Object.<string, no.Request.type_keyInfo>}
*/
no.Request._keys = {};

/**
    Получаем ключ из хранилища.

    @param {string} key
    @return {no.Request.type_keyInfo}
*/
no.Request.getKey = function(key) {
    return no.Request._keys[key];
};

/**
    Добавляем ключ в хранилище.

    @param {string} key
    @return {no.Request.type_keyInfo}
*/
no.Request.addKey = function(key) {
    var info = no.Request._keys[key];

    if (!info) {
        info = no.Request._keys[key] = {
            promise: new no.Promise(),
            retries: 0,
            requestCount: 1
        };
    } else {
        info.requestCount++;
    }

    return info;
};

/**
    Помечаем, что один из запросов больше не ожидает этот ключ.
    Удаляем ключ из хранилища, если он никому больше не нужен.

    @type {string} key
*/
no.Request.doneKey = function(key) {
    var info = no.Request._keys[key];

    if (!--info.requestCount) { // Это был последний запрос, ожидающий этот ключ.
        delete no.Request._keys[key]; // Удаляем ключ из хранилища.
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

no.Request.prototype.request = function() {
    var r_promises = [];
    var r_items = [];

    var items = this.items;
    for (var i = 0, l = items.length; i < l; i++) {
        var item = items[i];

        var key = item.key;
        var model = no.Model.get( item.model_id );

        if ( !item.force && model.isCached(key) ) { // Ключ уже в кэше и не передан флаг force.
            continue;
        }

        var requested = no.Request.getKey(key);
        if (!requested) {
            requested = no.Request.addKey(key);
        }

        // FIXME: Переделать на нормальный enum.
        var status = requested.status; // Возможные значения status'а и что это означает:
                                       //     true          ключ был запрошен, получен ответ;
                                       //     null          ключ запрошен, ожидаем ответ;
                                       //     undefined     ключ еще не запрашивался;
                                       //     false         ключ был запрошен, получен ответ с ошибкой или же ответ не получен (что тоже ошибка).

        if (status === true) {
            // FIXME: А что тут нужно делать-то?

        } else if (status === null) {
            r_promises.push( requested.promise ); // Подписываемся на уведомление о получении ответа.

        } else {
            requested.retries++;

            // Проверяем, нужно ли (можно ли) запрашивает этот ключ.
            if ( requested.status === false && !( model.needRetry(requested.error) && (requested.retries < model.retries) ) ) {
                continue; // Превышен лимит перезапросов или же модель говорит, что с такой ошибкой перезапрашивать ключ не нужно.
            }

            // status === undefined означает, что ключ еще не запрашивали.
            // Выставляем этому ключу минимальный request_id, который будет засчитан в качестве ответа.
            // Например, мы запросили ключ, а затем (пока первый ответ еще не пришел) запросили его еще раз с флагом force.
            // В этом случае, первый ответ не нужно учитывать.
            //
            // NOTE: С do-запросами ситуация другая. Они никогда не повторяются. В предущем примере, независимо от флага force во втором запросе,
            //       второй запрос все равно уйдет. И первый запрос получит ответ от первого же запроса, несмотря на отправленный второй запрос.
            //       Достигается это за счет того, что при построении ключа do-хэндлеров используется параметр _item_id.
            if ( requested.status === undefined || item.force ) {
                requested.request_id = this.id;
            }

            r_items.push( item );
            requested.status = null; // Ключ будет (пере)запрошен.
        }
    }

    var promises = [];

    var l = r_items.length;
    if (l) {
        var params = no.Request.items2params(r_items);
        promises.push( no.http('http://foo', params) ); // FIXME: Урл к серверной ручке.
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
        params[ '_model' + suffix ] = group.model_ids.join(',');

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
                model_ids: no.keys( models ),
                params: params
            });
            id++;
            models = null;
            params = {};
        };
    }

    for (var i = 0, l = items.length; i < l; i++) {
        var item = items[i];

        var merged = no.params.merge( params, item.params );

        if ( merged && !models[ item.model_id ] ) {
            add( item, merged );
        } else {
            close();
            add( item, item.params );
        }
    }
    if (!no.isEmpty(models)) {
        close();
    }

    return groups;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {Object} result
*/
no.Request.prototype.extractData = function(result) {
    var items = this.items;

    var timestamp = +new Date();

    for (var i = 0, l = items.length; i < l; i++) {
        var item = items[i];

        var data;
        var group = result[ item.group_id ];
        if (group) {
            data = group[ item.model_id ];
        } // FIXME: А если !group?

        var requested = no.Request.getKey( item.key );

        var model = no.Model.get( item.model_id );

        var error;
        if (data) {
            error = model.hasErrors(data);
        } else {
            error = {
                id: 'NO_DATA',
                reason: 'Server returned no data'
            }
        }

        if (error) {
            requested.error = error;
            requested.status = false;
        } else {
            // FIXME: Сравнить requested.request_id и this.id.
            model.setCache(item.key, data, item.params, timestamp);
            requested.data = data;
            requested.promise.resolve();
            requested.status = true; // FIXME: А не должен ли requested удалиться в этот же момент?
        }

    }
};

/**
*/
no.Request.prototype.done = function() {
    var items = this.items;

    var result = this.buildResult();

    for (var i = 0, l = items.length; i < l; i++) {
        no.Request.doneKey( items[i].key );
    }

    this.promise.resolve(result);
};

/**
    @return {Array.<{ error: (Object|undefined), data: (Object|undefined) }>}
*/
no.Request.prototype.buildResult = function() {
    var result = [];

    var items = this.items;
    for (var i = 0, l = items.length; i < l; i++) {
        var item = items[i];

        var requested = no.Request.getKey( item.key );
        if (requested.error) {
            result[i] = {
                error: requested.error
            };
        } else {
            result[i] = {
                data: requested.data
            }
        }
    }

    return result;
};

// ----------------------------------------------------------------------------------------------------------------- //
// no.request
// ----------------------------------------------------------------------------------------------------------------- //

no.request = function(items, callback) {
    var request = new no.Request(items);
    if (callback) {
        request.promise.then(callback);
    }
    return request;
};

