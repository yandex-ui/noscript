// ----------------------------------------------------------------------------------------------------------------- //
// no.Request
// ----------------------------------------------------------------------------------------------------------------- //

/**
    @constructor
    @param {no.Request.type_requestItems} items
*/
no.Request = function(items) {
    this.id = no.Request.id++;

    this.items = items;
    this.promise = new no.Promise(); // FIXME: Может это нужно делать в методе send/request/...?

    for (var i = 0, l = items.length; i < l; i++) {
        var item = items[i];

        var params = item.params;

        // FIXME: А это зачем?
        params['_request_id'] = this.id; // Этот (или следующий?) параметр предполагается для построения ключа do-моделей.
        params['_item_id'] = no.Request.item_id++;

        var model = no.Model.get( item.model_id );

        item.key = model.getKey(params);

        // TODO: Если это do-item, то сбросить соответствующие кэши.
        //       Например, после do_addAlbum сбрасывать albumList.
    }

    this.request();
};

no.Request.prototype.cancel = function() {}; // FIXME: Нужно ли это?

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
no.Request.id = 0;

/** @type {number} */
no.Request.item_id = 0;

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @type {Object.<string, no.Request.type_keyInfo>}
*/
no.Request.keys = {};

/**
    @param {string} key
    @return {no.Request.type_keyInfo}
*/
no.Request.getKey = function(key) {
    return no.Request.keys[key];
};

/**
    @param {string} key
    @return {no.Request.type_keyInfo}
*/
no.Request.addKey = function(key) {
    var keyinfo = no.Request.keys[key];

    if (!keyinfo) {
        keyinfo = no.Request.keys[key] = {
            promise: new no.Promise(),
            retries: 0,
            requestCount: 0
        };
    }

    return keyinfo;
};

/**
    @type {string} key
*/
no.Request.doneKey = function(key) {
    var keyinfo = no.Request.keys[key];

    if (keyinfo) { // FIXME: Как может быть так, чтобы keyinfo было undefined? Вроде никак.
        if (!--keyinfo.requestCount) {
            delete no.Request.keys[key];
        }
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

        console.log( 'item', key, model.isCached(key) );
        if ( !item.force && model.isCached(key) ) {
            continue;
        }

        var requested = no.Request.getKey(key);
        console.log('requested', requested);

        if (requested && requested.status === null) { // status === null означает, что этот ключ уже запрошен и мы ожидаем ответа от сервера.
            r_promises.push( requested.promise );

        } else {

            requested = requested || no.Request.addKey(key);

            requested.retries++;
            console.log( requested.status, requested.retries, model.retries );
            // status === false означает, что этот ключ уже был запрошен, но либо пришла ошибка, либо вообще ничего (что тоже ошибка).
            if ( requested.status === false && !( model.needRetry(requested.error) && (requested.retries < model.retries) ) ) {
                continue;
            }

            console.log('DO REQUEST');

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
            requested.requestCount++;

            r_items.push( item );
            requested.status = null;
        }
    }

    console.log(r_promises, r_items);
    if (r_promises.length || r_items.length) {

        var promises = [ no.Promise.wait(r_promises) ];

        if (r_items.length) {
            var params = no.Request.items2params(r_items);
            promises.push( no.http('http://foo', params) );
        }

        var that = this;
        no.Promise.wait( promises ).then( function(r) { // В r должен быть массив из одного или двух элементов.
                                                        // Если мы делали http-запрос и в promises было два promise'а, то в r[1] должен быть
                                                        // результат этого http-запроса.
            if (r[1]) {
                that.extractData(r[1]);
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
    @param {no.Request.type_requestItems} items
    @return {!Object}
*/
no.Request.items2params = function(items) {
    var groups = no.Request.items2groups(items);

    var params = {};

    for (var i = 0, l = groups.length; i < l; i++) {
        var group = groups[i];

        var suffix = '.' + i;
        params[ '_model' + suffix ] = group.model_ids.join(',');

        for (var key in group.params) {
            if (!/^_/.test(key)) {
                params[ key + suffix ] = group.params[key];
            }
        }
    }

    return params;
};

/**
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
    if (!no.object.empty(models)) {
        close();
    }

    return groups;
};

// ----------------------------------------------------------------------------------------------------------------- //

no.Request.prototype.extractData = function(result) {
    console.log('result', result);

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
                reason: '' // FIXME
            }
        }

        console.log('extract item', item.key, item.group_id, data, error);
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

no.Request.prototype.done = function() {
    var items = this.items;

    var result = this.result();

    for (var i = 0, l = items.length; i < l; i++) {
        no.Request.doneKey( items[i].key );
    }

    this.promise.resolve(result);
};

no.Request.prototype.result = function() {
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

