// ----------------------------------------------------------------------------------------------------------------- //
// no.Request
// ----------------------------------------------------------------------------------------------------------------- //

/**
    @constructor
    @param {no.Request.type_request} items
*/
no.Request = function(items) {
    this.id = no.Request.id++;

    this.items = items;
    this.promise = new no.Promise();

    for (var i = 0, l = items.length; i < l; i++) {
        var item = items[i];

        var params = item.params;
        params['_request_id'] = this.id;
        params['_item_id'] = no.Request.item_id++;

        var model = no.Model.get( item.model_id );

        item.key = model.getKey(params);

        item.retries = 0;

        // TODO: Если это do-item, то сбросить соответствующие кэши.
        //       Например, после do_addAlbum сбрасывать albumList.
    }

    this.request();
};

// ----------------------------------------------------------------------------------------------------------------- //

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
no.Request.type_request;

// ----------------------------------------------------------------------------------------------------------------- //

/** @type {number} */
no.Request.id = 0;

/** @type {number} */
no.Request.item_id = 0;

// ----------------------------------------------------------------------------------------------------------------- //

no.Request.keys = {};

no.Request.getKey = function(key) {
    return no.Request.keys[key];
};

no.Request.addKey = function(key) {
    // FIXME: Не нужно ли тут проверять, не добавлен ли уже этот ключ?

    var data = no.Request.keys[key] = {
        promise: new no.Promise(),
        retries: 0,
        requestCount: 0
    };

    return data;
};

no.Request.doneKey = function(key) {
    var data = no.Request.keys[key];
    if (data) {
        if (!--data.requestCount) {
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

        if (requested && requested.status === null) {
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

            r_items.push( item );
            requested.status = null;
        }
    }

    console.log(r_promises, r_items);
    if (r_promises.length || r_items.length) {

        var promises = [ no.promise(r_promises) ];

        if (r_items.length) {
            var params = no.Request.items2params(r_items);
            promises.push( no.http('http://foo', params) );
        }

        var that = this;
        no.promise( promises ).then( function(r) {
            if (r[1]) {
                that.extractData(r[1]);
            }
            that.request();
        } );

    } else {
        this.done();
    }

};

// ----------------------------------------------------------------------------------------------------------------- //

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
    result = result || [];

    var items = this.items;

    var timestamp = +new Date();

    for (var i = 0, l = items.length; i < l; i++) {
        var item = items[i];

        var data;
        var group = result[ item.group_id ];
        if (group) {
            data = group[ item.model_id ];
        }

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
            model.setCache(item.key, data, item.params, timestamp);
            requested.data = data;
            requested.promise.resolve();
            requested.status = true;
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

no.request = function(items, callback) {
    var request = new no.Request(items);
    if (callback) {
        request.promise.then(callback);
    }
    return request;
};

