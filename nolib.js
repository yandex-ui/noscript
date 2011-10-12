// ------------------------------------------------------------------------------------------------------------- //
// no
// ------------------------------------------------------------------------------------------------------------- //

var no = {};

// ------------------------------------------------------------------------------------------------------------- //

no.inherits = function(child, parent) {
    var F = function() {};
    F.prototype = parent.prototype;
    child.prototype = new F();
    child.prototype.constructor = child;
};

// ------------------------------------------------------------------------------------------------------------- //

/**
    @param {!Object} dest
    @param {...!Object} srcs
    @return {!Object}
*/
no.extend = function(dest) {
    var srcs = [].slice.call(arguments, 1);

    for (var i = 0, l = srcs.length; i < l; i++) {
        var src = srcs[i];
        for (var key in src) {
            dest[key] = src[key];
        }
    }

    return dest;
};

// ------------------------------------------------------------------------------------------------------------- //

/**
    Пустая функция. No operation.
*/
no.pe = function() {};

// ------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} className
    @param {Element} context
    @return {Array.<Element>}
*/
no.byClass = function(className, context) {
    context = context || document;
    return context.getElementsByClassName(className); // FIXME: Поддержка старых браузеров.
};

// ------------------------------------------------------------------------------------------------------------- //

/**
    @param {Element} oldNode
    @param {Element} newNode
*/
no.replaceNode = function(oldNode, newNode) {
    oldNode.parentNode.replaceChild(newNode, oldNode);
};

// ------------------------------------------------------------------------------------------------------------- //
// no.array
// ------------------------------------------------------------------------------------------------------------- //

no.array = function(s) {
    return (s instanceof Array) ? s : [ s ];
};

/**
    @param {Array.<string>} array
    @return {Object.<string, boolean>}
*/
no.array.toObject = function(array) {
    var object = {};

    for (var i = 0, l = array.length; i < l; i++) {
        object[ array[i] ] = true;
    }

    return object;
};

/**
    @param {Array} array
    @param {function} filter
    @return {Array}
*/
no.array.grep = function(array, filter) {
    var r = [];

    for (var i = 0, l = array.length; i < l; i++) {
        var value = array[i];
        if (filter(value, i)) {
            r.push(value);
        }
    }

    return r;
};

// ------------------------------------------------------------------------------------------------------------- //

/**
    @param {Array} array
    @param {function(*): boolean} condition
    @return {number}
*/
no.array.firstMatch = function(array, condition) {
    for (var i = 0, l = array.length; i < l; i++) {
        if (condition( array[i] )) {
            return i;
        }
    }

    return -1;
};

// ------------------------------------------------------------------------------------------------------------- //
// no.object
// ------------------------------------------------------------------------------------------------------------- //

no.object = {};

/**
    @param {!Object} obj
    @return {Array.<string>} Возвращает список всех ключей объекта.
*/
no.object.keys = function(obj) {
    var keys = [];

    for (var key in obj) {
        keys.push(key);
    }

    return keys;
};

/**
    @param {!Object} obj
    @return {boolean} Определяет, пустой ли объект или нет.
*/
no.object.isEmpty = function(obj) {
    for (var key in obj) {
        return false;
    }

    return true;
};

// ------------------------------------------------------------------------------------------------------------- //
// no.events
// ------------------------------------------------------------------------------------------------------------- //

no.events = {};

// ------------------------------------------------------------------------------------------------------------- //

/**
    Тип для обработчиков событий.
    @typedef {function(string, *=)}
*/
no.events.type_handler;

// ------------------------------------------------------------------------------------------------------------- //

/**
    Внутренний кэш обработчиков событий.
    @type {Object.<string, Array.<no.events.type_handler>>}
*/
no.events._handlers = {};

/**
    @type {number}
*/
no.events._hid = 1;

/**
    @const
*/
no.events._hid_key = '_hid';

// ------------------------------------------------------------------------------------------------------------- //

/**
    Возвращает список обработчиков события name.
    Если еще ни одного обработчика не забинжено, возвращает (и сохраняет) пустой список.

    @param {string} name
    @return {Array.<no.events.type_handler>}
*/
no.events._get = function(name) {
    var handlers = no.events._handlers[name];
    if (!handlers) {
        handlers = no.events._handlers[name] = [];
    }
    return handlers;
};

// ------------------------------------------------------------------------------------------------------------- //

/**
    Подписываем обработчик handler на событие name.

    @param {string} name
    @param {no.events.type_handler} handler
*/
no.events.bind = function(name, handler) {
    var handlers = no.events._get(name);

    var hid = handler[ no.events._hid_key ];
    if (!hid) {
        handler[ no.events._hid_key ] = no.events._hid++;
    } else {
        var i = no.array.firstMatch(handlers, function(handler) { // Ищем этот обработчик среди уже подписанных.
            return ( handler[ no.events._hid_key ] === hid );
        });
        if (i !== -1) { return; } // Этот обработчик уже подписан.
    }

    handlers.push(handler);
};

/**
    Отписываем обработчик handler от события name.
    Если не передать handler, то удалятся вообще все обработчики события name.

    @param {string} name
    @param {no.events.type_handler=} handler
*/
no.events.unbind = function(name, handler) {
    if (handler) {
        var hid = handler[ no.events._hid_key ];

        var handlers = no.events._get(name);
        var i = no.array.firstMatch(handlers, function(_handler) { // Ищем этот хэндлер среди уже забинженных обработчиков этого события.
            return ( _handler._hid === hid );
        });

        if (i !== -1) {
            handlers.splice(i, 1); // Нашли и удаляем этот обработчик.
        }
    } else {
        delete no.events._handlers[name]; // Удаляем всех обработчиков этого события.
    }
};

// ------------------------------------------------------------------------------------------------------------- //

/**
    "Генерим" событие name. Т.е. вызываем по-очереди (в порядке подписки) все обработчики события name.
    В каждый передаем name и params.

    @param {string} name
    @param {*=} params
*/
no.events.trigger = function(name, params) {
    var handlers = no.events._get(name).slice(0); // Копируем список хэндлеров. Если вдруг внутри какого-то обработчика будет вызван unbind,
                                                  // то мы не потеряем вызов следующего обработчика.
    for (var i = 0, l = handlers.length; i < l; i++) {
        handlers[i](name, params);
    }
};

// ----------------------------------------------------------------------------------------------------------------- //
// no.Promise
// ----------------------------------------------------------------------------------------------------------------- //

/**
    Объект, обещающий вернуть некий результат в будущем.
    Обычно результат получается в результате некоторых асинхронных действий.

    В сущности, это аналог обычных callback'ов, но более продвинутый.
    А точнее, это событие, генерящееся при получении результата и на которое
    можно подписаться:

        var promise = new no.Promise();

        promise.then(function(result) { // Подписываемся на получение результата.
            console.log(result); // 42
        });

        // И где-то дальше:
        ... promise.resolve(42); // Рассылаем результат всем подписавшимся.

    Можно подписать на результат несколько callback'ов:

        promise.then(function(result) { // Все методы then, else_, resolve, reject и wait -- chainable.
            // Сделать что-нибудь.
        }).then(function(result) {
            // Сделать что-нибудь еще.
        });

    Можно подписываться на результат даже после того, как он уже получен:

        var promise = new no.Promise();
        promise.resolve(42);

        promise.then(function(result) { // callback будет выполнен немедленно.
            console.log(result); // 42
        });

    Имея список из нескольких promise'ов, можно создать новый promise,
    которое зарезолвится только после того, как зарезолвятся все promise'ы из списка:

        var p1 = new no.Promise();
        var p2 = new no.Promise();

        var p = no.Promise.wait([ p1, p2 ]);
        p.then(function(result) { // В result будет массив из результатов p1 и p2.
            console.log(result); // [ 42, 24 ]
        });

        p2.resolve(24); // Порядок, в котором резолвятся promise'ы из списка не важен.
                        // При это в результате порядок будет тем же, что и promise'ы в wait([ ... ]).
        p1.resolve(42);

    К методам then/resolve есть парные методы else_/reject для ситуации, когда нужно вернуть
    не результат, а какую-нибудь ошибку.

        var p1 = new no.Promise();
        var p2 = new no.Promise();

        var p = no.Promise.wait([ p1, p2 ]);
        p.else_(function(error) {
            console.log(error); // 'Foo!'
        });

        p1.resolve(42);
        p2.reject('Foo!'); // Если режектится любой promise из списка, p тоже режектится.

    @constructor
*/
no.Promise = function() {
    this.thens = [];
    this.elses = [];
};

// ----------------------------------------------------------------------------------------------------------------- //

// NOTE: Да, ниже следует "зловещий копипаст". Методы then/else_ и resolve/reject совпадают почти дословно.
//       Альтернатива в виде прокладки, реализующей только then/resolve (как, например, в jQuery), мне не нравится.

/**
    Добавляем callback, ожидающий обещанный результат.
    Если promise уже зарезолвился, callback выполняется немедленно.

    @param {function(*)} callback
    @return {no.Promise}
*/
no.Promise.prototype.then = function(callback) {
    if (this.rejected) { return null; }

    if (this.resolved) {
        callback(this.result);
    } else {
        this.thens.push(callback);
    }

    return this;
};

/**
    Тоже самое, что и then.

    @param {function(*)} callback
    @return {no.Promise}
*/
no.Promise.prototype.else_ = function(callback) {
    if (this.resolved) { return null; }

    if (this.rejected) {
        callback(this.result);
    } else {
        this.elses.push(callback);
    }

    return this;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    Передать результат всем подписавшимся.

    @param {*} result
    @return {no.Promise}
*/
no.Promise.prototype.resolve = function(result) {
    if (!(this.resolved || this.rejected)) {
        this.resolved = true;
        this.result = result;

        var thens = this.thens;
        for (var i = 0, l = thens.length; i < l; i++) {
            thens[i](result);
        }
        this.thens = this.elses = null;
    }

    return this;
};

/**
    Тоже самое, что и resolve.

    @param {*} error
    @return {no.Promise}
*/
no.Promise.prototype.reject = function(error) {
    if (!(this.rejected || this.resolved)) {
        this.rejected = true;
        this.error = error;

        var elses = this.elses;
        for (var i = 0, l = elses.length; i < l; i++) {
            elses[i](error);
        }
        this.thens = this.elses = null;
    }

    return this;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    Проксируем resolve/reject в другой promise.

    @param {no.Promise}
    @return {no.Promise}
*/
no.Promise.prototype.pipe = function(promise) {
    this.then(function(result) {
        promise.resolve(result);
    });
    this.else_(function(error) {
        promise.reject(error);
    });

    return this;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    Создать из массива promise'ов новый promise, который зарезолвится только после того,
    как зарезолвятся все promise'ы из списка. Результатом будет массив результатов.

    @param {Array.<no.Promise>} promises
    @return {no.Promise}
*/
no.Promise.wait = function(promises) {
    var wait = new no.Promise();

    var results = [];
    var l = promises.length;
    var n = l;
    for (var i = 0; i < l; i++) {
        (function(promise, i) { // Замыкание, чтобы сохранить значения promise и i.

            promise.then( function(result) {
                results[i] = result;
                if (!--n) {
                    wait.resolve(results);
                }
            } );

            promise.else_( function(error) {
                // FIXME: Может тут нужно сделать results = null; ?
                wait.reject(error);
            } );

        })(promises[i], i);

    };

    return wait;
};

// ------------------------------------------------------------------------------------------------------------- //
// no.Future
// ------------------------------------------------------------------------------------------------------------- //

no.Future = function(worker) {
    this.worker = worker;
};

no.Future.prototype.run = function(params) {
    var promise = new no.Promise();

    this.worker(promise, params);

    return promise;
};

// ------------------------------------------------------------------------------------------------------------- //

no.Future.Wait = function(futures) {
    this.futures = futures;
};

no.Future.Wait.prototype.run = function(params) {
    var promises = [];

    var futures = this.futures;
    for (var i = 0, l = futures.length; i < l; i++) {
        promises.push( futures[i].run(params) );
    }

    return no.Promise.wait( promises );
};

no.Future.wait = function(futures) {
    return new no.Future.Wait(futures);
};

// ------------------------------------------------------------------------------------------------------------- //

no.Future.Seq = function(futures) {
    this.futures = futures;
};

no.Future.Seq.prototype.run = function(params) {
    var promise = new no.Promise;

    var futures = this.futures;
    var l = futures.length;

    var results = [];
    (function run(i, params) {
        if (i < l) {
            futures[i].run(params)
                .then(function(result) {
                    results[i] = result;
                    run(i + 1, result);
                })
                .else_(function(error) {
                    promise.reject(error);
                });
        } else {
            promise.resolve(results);
        }
    })(0, params);

    return promise;
};

no.Future.seq = function(futures) {
    return new no.Future.Seq(futures);
};

// ------------------------------------------------------------------------------------------------------------- //
// no.http
// ------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} url
    @param {Object} params
    @return {no.Promise}
*/
no.http = function(url, params) {
    var promise = new no.Promise();

    $.ajax({
        url: url,
        data: params,
        dataType: 'json',
        success: function(data) {
            promise.resolve(data);
        }
    });

    return promise;
};

// ----------------------------------------------------------------------------------------------------------------- //
// no.Model
// ----------------------------------------------------------------------------------------------------------------- //

/**
    @constructor
    @param {string} id
    @param {no.Model.type_info} info
*/
no.Model = function(id, info) {
    this.id = id;
    this.info = info;

    /** @type { Object.<string, no.Model.type_cacheItem> } */
    this._cache = {};
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @typedef {{
        data: Object,
        timestamp: number,
        params: !Object
    }}
*/
no.Model.type_cacheItem;

/**
    @typedef {function(
        new:no.Model,
        string,
        no.Model.type_info
    )}
*/
no.Model.type_create;

/**
    @typedef {{
        params: !Object
    }}
*/
no.Model.type_info;

// ----------------------------------------------------------------------------------------------------------------- //

/** @type { Object.<string, no.Model.type_create> } */
no.Model._classes = {};

/** @type { Object.<string, no.Model.type_info> } */
no.Model._infos = {};

/** @type { Object.<string, no.Model> } */
no.Model._instances = {};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} id
    @param {no.Model.type_info=} info
    @param {no.Model.type_create=} class_
    @return {no.Model}
*/
no.Model.register = function(id, info, class_) {
    info = info || {};

    no.Model._infos[id] = info;
    no.Model._classes[id] = class_ || no.Model;

    info.params = info.params || {};
    info.retries = info.retries || 3;

    info._keyParams = no.object.keys(info.params).sort();
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} id
    @return {no.Model.type_info}
*/
no.Model.getInfo = function(id) {
    return no.Model._infos[id];
};

/**
    @param {string} id
    @return {no.Model}
*/
no.Model.get = function(id) {
    var model = no.Model._instances[id];

    if (!model) {
        var info = no.Model._infos[id];
        var class_ = no.Model._classes[id];
        model = no.Model._instances[id] = new class_(id, info);
    }

    return model;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {!Object} params
    @return {string}
*/
no.Model.prototype.getKey = function(params) {
    var defaultParams = this.info.params;
    var keyParams = this.info._keyParams;

    var key = 'model=' + this.id;

    for (var i = 0, l = keyParams.length; i < l; i++) {
        var pName = keyParams[i];
        var pValue = params[pName];
        if (pValue && pValue !== defaultParams[pName]) {
            key += '&' + pName + '=' + pValue;
        }
    }

    return key;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} key
    @return {no.Model.type_cacheItem}
*/
no.Model.prototype.getRawCache = function(key) {
    return this._cache[key];
};

/**
    @param {!Object} params
    @return {no.Model.type_cacheItem}
*/
no.Model.prototype.getRawCacheByParams = function(params) {
    var key = this.getKey(params);
    return this._cache[key];
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} key
    @return {Object}
*/
no.Model.prototype.getCache = function(key) {
    var cached = this._cache[key];
    if (cached) {
        return cached.data;
    }
};

/**
    @param {!Object} params
    @return {Object}
*/
no.Model.prototype.getCacheByParams = function(params) {
    var key = this.getKey(params);
    return this.getCache(key);
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} key
    @return {(boolean|undefined)}
*/
no.Model.prototype.isCached = function(key) {
    var cached = this._cache[key];
    if (!cached) { return; } // undefined означает, что кэша нет вообще никакого, а false, что есть, но уже неактуальный.


    var maxage = this.info.maxage; // Время жизни кэша в милисекундах. После прошествии этого времени, кэш будет считаться невалидным.
    if (maxage) {
        var now = +new Date();
        var timestamp = cached.timestamp;

        if (now - timestamp > maxage) { return false; }
    }

    return true;
};

/**
    @param {string} key
    @param {Object} data
    @param {!Object} params
    @param {number} timestamp
    @param {boolean=} noforce
*/
no.Model.prototype.setCache = function(key, data, params, timestamp, noforce) {
    var cached = this._cache[key];

    if (!cached) {
        this._cache[key] = {
            data: data,
            timestamp: timestamp,
            params: params
        };
    } else if (!noforce) { // Если noforce, то не перезаписываем уже существующий кэш.
        cached.data = data;
        cached.timestamp = timestamp;
        // cached.params не перезаписываем никогда, т.к. они не могут измениться.
    }

    this.onsetcache(key, data, params); // Возможность что-нибудь сделать с новым значением кэша.
};

no.Model.prototype.onsetcache = no.pe;

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} key
*/
no.Model.prototype.unCache = function(key) {
    delete this._cache[key];
};

/**
    @param {function(string, no.Model.type_cacheItem) boolean=} condition
*/
no.Model.prototype.clearCache = function(condition) {
    if (condition) {
        var cache = this._cache;
        for (var key in cache) {
            if (condition(key, cache[key])) {
                this.unCache(key);
            }
        }
    } else {
        this._cache = {};
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} key
    @param {number=} timestamp
*/
no.Model.prototype.touch = function(key, timestamp) {
    timestamp = timestamp || +new Date();

    if (key) {
        var cached = this._cache[key];
        if (cached) {
            cached.timestamp = timestamp;
        }
    } else {
        var cache = this._cache;
        for (var key in cache) {
            cache.timestamp = timestamp;
        };
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {Object} data
    @return {boolean}
*/
no.Model.prototype.hasErrors = function(data) {
    return !!(data && data.error);
};

/**
    @param {Object} error
    @return {boolean}
*/
no.Model.prototype.needRetry = function(error) {
    return true;
};

// ----------------------------------------------------------------------------------------------------------------- //

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
    var r_items = [];

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

        if (this.id < requested.request_id) { // После этого запроса был послан еще один и мы ожидаем ответа от него.
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
    var items = this.items;

    var result = this.buildResult();

    for (var i = 0, l = items.length; i < l; i++) {
        no.Request.doneKey( items[i].key );
    }

    this._promise.resolve(result);
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

        result[i] = requested.data;
    }

    return result;
};

/**
    @constructor
    @param {string} id          Уникальный id класса. Важно! Это не id инстанса, у всех блоков этого класса один id.
    @param {string} path        path блока в дереве блоков (в общем-то это просто xpath, отложенный от корня дерева).
    @param {!Object} params     Параметры блока (участвуют при построении ключа).
*/
no.View = function(id, path, params) {
    this.id = id;
    this.params = params;
    this.path = path;

    var info = this.info = no.View.getInfo(id);

    /** @type { Object.<string, { type, view: no.View }> } */
    var views = this.views = {};

    var layout = info.layout;
    for (var view_id in layout) {
        var type = layout[ view_id ];

        var view = (type === null) ? this.subBox( view_id ) : this.subView( view_id );
        views[ view_id ] = {
            type: type,
            view: view
        };
    }

    /** @type {Element} */
    this.node;

    /** @type {boolean|undefined} */
    this.status;
};

/**
    @typedef {function(
        new:no.View,
        string,
        string,
        Object
    )}
*/
no.View.Create;

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @typedef {{
        layout: Object,
        models: Object
    }}
*/
no.View.Info;

// ----------------------------------------------------------------------------------------------------------------- //

/** @type { Object.<string, no.View.Info> } */
no.View._infos = {};

/** @type { Object.<string, no.View.Create> } */
no.View._classes = {};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} id
    @param {no.View.Info=} info
    @param {no.View.Create=} class_
*/
no.View.register = function(id, info, class_) {
    info = info || {};

    var models = info.models = info.models || {};

    var keyParams = {};
    for (var model_id in info.models) {
        no.extend( keyParams, no.View.getInfo( model_id ).params );
    }

    var layout = info.layout = info.layout || {};

    for (var view_id in layout) {
        if (layout[ view_id ] !== null) { // Это не box.
            var viewParams = no.View.getInfo( view_id )._keyParams;
            for (var i = 0, l = viewParams.length; i < l; i++) {
                keyParams[ viewParams[i] ] = true;
            }
        }
    }

    info._keyParams = no.object.keys(keyParams).sort();

    no.View._infos[id] = info;
    no.View._classes[id] = class_ || no.View;
};

/**
    @param {string} id
    @return {no.View.Info}
*/
no.View.getInfo = function(id) {
    return no.View._infos[id] || {};
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} view_id
    @param {string} path
    @param {Object} params
    @return {no.View}
*/
no.View.make = function( view_id, path, params ) {
    var class_ = no.View._classes[ view_id ];

    return new class_( view_id, path, params );
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} view_id
    @return {string}
*/
no.View.prototype.subPath = function( view_id ) {
    return this.path + '/' + view_id;
};

/**
    @param {string} view_id
    @return {no.View}
*/
no.View.prototype.subView = function( view_id ) {
    return no.View.make( view_id, this.subPath( view_id ), this.params );
};

/**
    @param {string} box_id
    @return {no.Box}
*/
no.View.prototype.subBox = function( box_id ) {
    return new no.Box( box_id, this.subPath( box_id ) );
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} view_id
    @param {Object} params
    @return {string}
*/
no.View.getKey = function(view_id, params) {
    var info = no.View.getInfo(view_id);

    var key = 'view=' + view_id;

    var keyParams = info._keyParams || [];
    for (var i = 0, l = keyParams.length; i < l; i++) {
        var pName = keyParams[i];
        var pValue = params[pName];
        if (pValue) {
            key += '&' + pName + '=' + pValue;
        }
    }

    return key;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @return {boolean}
*/
no.View.prototype.isCached = function() {
    return this.status;
};

/**
    @return {boolean}
*/
no.View.prototype.needUpdate = function(update) {
    return !this.status;
};

// ----------------------------------------------------------------------------------------------------------------- //

no.View.prototype.hide = function() {
    this.node.style.display = 'none';
};

no.View.prototype.show = function() {
    this.node.style.display = '';
};

// ----------------------------------------------------------------------------------------------------------------- //

no.View.prototype.onhtmlinit = no.pe;

no.View.prototype.onhtmldestroy = no.pe;

no.View.prototype.onshow = no.pe;

no.View.prototype.onhide = no.pe;

no.View.prototype.onrepaint = no.pe;

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {no.Update} update
    @return {Object}
*/
no.View.prototype.getLayoutTree = function(update) {
    var layout = update.layout;

    function viewTree(id, path, tree) {
        var viewLayout = no.View.getInfo(id).layout;

        if (no.object.isEmpty( viewLayout )) { // Обычный блок, без подблоков или боксов.
            tree[id] = true;
        } else {
            tree = tree[id] = {};

            for (var view_id in viewLayout) {
                var type = viewLayout[ view_id ];

                if (type === null) { // box.
                    boxTree( view_id, path, tree );
                } else { // view.
                    tree[ view_id ] = type;
                }
            }
        }
    }

    function boxTree(id, path, tree) {
        tree = tree[ id ] = {};

        var boxPath = path + '/' + id;

        var views = layout[ boxPath ];
        for (var i = 0, l = views.length; i < l; i++) {
            var view_id = views[i];
            var viewPath = boxPath + '/' + view_id;

            viewTree( view_id, viewPath, tree );
        }
    }

    var tree = {};
    viewTree( this.id, this.path, tree );

    return tree;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    Рекурсивно проходим по дереву блоков и ищем блоки, нуждающиеся в обновлении.
    Для каждого такого блока строим его layout tree и сохраняем в массиве trees.
    При этом под-дерево уже не обрабатываем (потому что оно все уже содержится в layout tree).

    В последствие, массив trees используется как "каркас" для наложения шаблона.
    Он показывает, какие блоки нужно сгенерить и какова структура этих блоков.

    @param {no.Update} update
    @param {Array} trees
*/
no.View.prototype.getUpdateTrees = function(update, trees) {
    if (this.needUpdate(update)) {
        trees.push( this.getLayoutTree(update) );
    } else {
        this.processChildren( function(view) {
            view.getUpdateTrees(update, trees);
        } );
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {Element} node
    @param {no.Update} update
    @param {boolean} replace
*/
no.View.prototype.update = function(node, update, replace) {
    if (!this.node) {
        this.node = no.byClass( 'view-' + this.id, node )[0];
        if (!this.node) { return; }
    }

    var views = this.views;
    for (var view_id in views) {
        views[ view_id ].view.update(node, update, false);
    }

    if (replace) {
        no.replaceNode(this.node, node);
    }

    this.status = true;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    Рекурсивно обходим все дерево блока и применяем к каждому потомку (блоку или боксу) переданный callback.

    При этом сперва вызываем callback, а потом уже обрабатываем под-дерево.
    Если же callback возвращает false, то подблоки не обрабатываем.

    @param {function((no.View|no.Box)): (boolean|undefined)} callback
*/
no.View.prototype.processTree = function(callback) {
    var r = callback(this);
    if (r === false) { return; }

    var views = this.views;
    for (var view_id in views) {
        var view = views[ view_id ].view;
        view.processTree(callback);
    }
};

/**
    Применяем переданный callback ко всем "детям" блока.
    Т.е. к непосредственным потомкам этого блока.

    @param {function(no.View|no.Box)} callback
*/
no.View.prototype.processChildren = function(callback) {
    var views = this.views;
    for (var view_id in views) {
        var view = views[ view_id ].view;
        callback(view);
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    Превращаем массив id-шников блоков в массив ключей блоков,
    соответствующих переданным параметрам.

    @param {Array.<string>} ids
    @param {Object} params
    @return {Array.<string>}
*/
no.View.ids2keys = function(ids, params) {
    var keys = [];
    for (var i = 0, l = ids.length; i < l; i++) {
        keys.push( no.View.getKey( ids[i], params ) );
    }
    return keys;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @constructor
    @param {string} id
    @param {string} path
*/
no.Box = function(id, path) {
    this.id = id;
    this.path = path;

    /** @type { Object.<string, no.View> } */
    this.archive = {};

    /** @type {Element} */
    this.node;

    /** @type {boolean|undefined} */
    this.status;

    /** @type {Array.<string>} */
    this.current;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} view_id
    @return {string}
*/
no.Box.prototype.subPath = function( view_id ) {
    return this.path + '/' + view_id;
};

/**
    @param {string} view_id
    @param {Object} params
    @return {no.View}
*/
no.Box.prototype.subView = function( view_id, params ) {
    return no.View.make( view_id, this.subPath( view_id ), params );
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {Element} node
    @param {no.Update} update
*/
no.Box.prototype.update = function(node, update) {
    if (!this.status) {
        var node = no.byClass('box-' + this.id, node)[0];
        if (!node) { return; }

        this.node = node;
        this.status = true;
    }

    var params = update.params;
    var archive = this.archive;

    // Свежесозданный box. Создаем актуальный current -- список блоков, которые в нем лежат в данный момент.
    // А это те блоки, которые сгенерились в html'е.
    // Они могут быть:
    //   - не все, что положены по layout'у;
    //   - в неправильном порядке (из-за того, что хэши в javascript'е не упорядоченные, вообще говоря).
    // Поэтому приходится смотреть, что же там сгенерилось и в каком порядке.
    // Дальше, если порядок неправильный, блоки будут переставлены в нужном порядке дальше, в updateCurrent().

    if (!this.current) {
        var current = [];
        var children = node.children; // FIXME: node.children не работает в FF3.0.

        for (var i = 0, l = children.length; i < l; i++) {
            var child = children[i];
            var className = child.className;
            var r = className.match(/\bview-(\S+)\b/);
            if (r) {
                var view_id = r[1];

                var key = no.View.getKey(view_id, params);
                current.push(key);

                var view = archive[key] = this.subView(view_id, params);
                view.update(this.node, update, false); // FIXME: Плохо, что child уже найден, а передаем мы node.
            }
        }

        this.current = current;
    }

    this.updateCurrent(node, update);

};

/**
    @param {Element} node
    @param {no.Update} update
*/
no.Box.prototype.updateCurrent = function(node, update) {
    var params = update.params;

    var archive = this.archive;

    var views = update.layout[ this.path ];
    var content = no.View.ids2keys(views, params);
    var contentKeys = no.array.toObject(content);

    var current = no.array.grep(this.current, function(key) {
        if (!(key in contentKeys)) {
            archive[key].hide();
            return false;
        }
        return true;
    });

    for (var i = 0, l = views.length; i < l; i++) {
        var view_id = views[i];
        var key = content[i];

        var view = archive[key];
        if (!view) {
            view = archive[key] = this.subView(view_id, params);
        }
        view.update(node, update);
        view.show();

        this.node.appendChild(view.node);
    }

    this.current = content;
};


// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {function(no.View): (boolean|undefined)}
*/
no.Box.prototype.processTree = function(callback) {
    var r = callback(this);
    if (r === false) { return; }

    var current = this.current;
    if (current) {
        var archive = this.archive;
        for (var i = 0, l = current.length; i < l; i++) {
            var view = archive[ current[i] ];
            view.processTree(callback);
        }
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {no.Update} update
    @return {boolean}
*/
no.Box.prototype.needUpdate = function(update) {
    var current = this.current;
    if (!current) { return true; }

    var content = no.View.ids2keys( update.layout[ this.path ], update.params );

    return ( content.join('|') !== current.join('|') );
};


/**
    @param {no.Update} update
    @param {Object} trees
*/
no.Box.prototype.getUpdateTrees = function(update, trees) {
    var archive = this.archive;
    var params = update.params;

    var content_ids = update.layout[ this.path ];
    var content_keys = no.View.ids2keys( content_ids, params );

    for (var i = 0, l = content_keys.length; i < l; i++) {
        var key = content_keys[i];
        var view = archive[key];
        if (!archive[key]) {
            view = this.subView( content_ids[i], params );
        }
        view.getUpdateTrees(update, trees);
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

no.layout = {};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @private
    @type { Object.<string, !Object> }
*/
no.layout._raw = {};

/**
    @private
    @type { Object.<string, !Object> }
*/
no.layout._compiled = {};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} id
    @param {!Object} layout
*/
no.layout.register = function(id, layout) {
    no.layout._raw[id] = layout;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} id
    @return {!Object}
*/
no.layout.get = function(id) {
    var compiled = no.layout._compiled[id];

    if (!compiled) {
        compiled = {};
        var raw = no.layout._raw[id];

        var parent_id = raw[ '..' ];
        if (parent_id) {
            var parent = no.layout.get( parent_id );
            no.extend( compiled, parent );

            delete raw[ '..' ];
        }

        for (var key in raw) {
            var value = raw[key];
            if (value) {
                compiled[key] = no.array(value);
            }
        }

        no.layout._compiled[id] = compiled;
    }

    return compiled;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} url
    @return {{ page: string, params: Object }}
*/
no.router = function(url) {

    var routes = no.router.routes;

    // Применяем поочередно все "реврайты", пока не найдем подходящий.
    for (var i = 0, l = routes.length; i < l; i++) {
        var route = routes[i];

        var r = route.regexp.exec(url);
        if (r) {
            var tokens = route.tokens;
            var params = {};

            // Вытаскиваем параметры из основной части урла. Имена параметров берем из массива tokens.
            var l = tokens.length;
            for (var i = 0; i < l; i++) {
                params[ tokens[i] ] = r[ i + 1 ];
            }

            // Смотрим, есть ли дополнительные get-параметры, вида ?param1=value1&param2=value2...
            var query = r[l + 1];
            if (query) {
                no.extends( params, no.parseQuery(query) );
            }

            return {
                page: route.page,
                params: params
            };
        }
    }

    // Ничего подходящего не нашли.
    return {
        page: 'not-found',
        params: {}
    };

};

// ----------------------------------------------------------------------------------------------------------------- //

no.router.init = function() {
    var _routes = [];

    var routes = no.router.routes;
    for (var i = 0, l = routes.length; i < l; i += 2) {
        var compiled = no.router.compile( routes[i] );
        compiled.page = routes[i + 1];

        _routes.push( compiled );
    }

    no.router.routes = _routes;
};

/**
    @param {string} route
    @return {{ regexp: RegExp, tokens: Array.<string> }}
*/
no.router.compile = function(route) {
    var regexp = route.replace(/\/$/, ''); // Отрезаем последний слэш, он ниже добавится как необязательный.

    var tokens = [];
    regexp = regexp.replace(/{(.*?)}/g, function(_, token) { // Заменяем {name} на кусок регэкспа соответствующего типу токена name.
        var type = no.router.types[ token ] || 'id';
        var rx_part = no.router.regexps[ type ];
        tokens.push(token); // Запоминаем имя токена, оно нужно при парсинге урлов.

        return '(' + rx_part + ')';
    });
    regexp = '^' + regexp + '\/?(?:\\?(.*))?$'; // Добавляем "якоря" ^ и $;
                                                // Плюс матчим необязательный query-string в конце урла, вида ?param1=value1&param2=value2...

    return {
        regexp: new RegExp(regexp),
        tokens: tokens
    };
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @constructor
    @param {no.View} view
    @param {string} layout_id
    @param {Object} params
*/
no.Update = function(view, layout_id, params) {
    this.id = no.Update.id++;

    this.view = view;
    this.layout_id = layout_id;
    this.params = params;

    this.layout = no.layout.get( layout_id );

    this.prepare();
    this.request();
};

/** @type {number} */
no.Update.id = 0;

// ----------------------------------------------------------------------------------------------------------------- //

no.Update.prototype.prepare = function() {
    this.requests = {};

    var tree = this.tree = this.view.getLayoutTree(this);

    var params = this.params;

    var that = this;
    no.Update.walkLeafs(tree, function(view_id, type) {
        var models = no.View.getInfo( view_id ).models;
        for (var i = 0, l = models.length; i < l; i++) {
            var model_id = models[i];
            var item = {
                model_id: model_id,
                params: params,
                key: no.Model.get( model_id ).getKey( params )
            };

            that.addItemToRequest('all', item);
            // FIXME: Добавить item в lazy/nonlazy.
        }
    });
};

/**
    @param {!Object} obj
    @param {function} callback
*/
no.Update.walkLeafs = function(obj, callback) {
    for (var key in obj) {
        var value = obj[key];
        if (typeof value !== 'object') {
            callback(key, value);
        } else {
            no.Update.walkLeafs(value, callback);
        }
    }
};


/**
    @param {boolean|string|undefined} type
    @param {{ model_id: string, params: Object, key: string }} item
*/
no.Update.prototype.addItemToRequest = function(type, item) {
    var items = this.requests[type];
    if (!items) {
        items = this.requests[type] = {};
    }

    items[ item.key ] = item;
};

// ----------------------------------------------------------------------------------------------------------------- //

no.Update.prototype.request = function() {
    var all = no.object.keys( this.requests['all'] );
    // FIXME: Отправить запрос и подписаться на ответ.
    // FIXME: Построить дерево для наложения шаблонов.
    // FIXME: Наложить шаблон и получить результат в виде html-ноды.

    var viewsTree = [];
    this.view.getUpdateTrees(this, viewsTree);

    var tree = {
        views: viewsTree,
        update_id: this.id
    };

    var html = stylesheet( tree );
    var div = document.createElement('div');
    div.innerHTML = html;

    var node = div.firstChild;

    this.update(node);
};

/**
    @param {Element} node
*/
no.Update.prototype.update = function(node) {
    /*
    if (this.canceled || this.id < no.Update.id) { // Запущен какой-то новый update, этот выполнять уже ненужно.
        return;
    }
    */

    /*
    if (!this.hasAllData()) {
        // ERROR.
        return;
    }
    */


    var that = this;
    this.view.processTree(function(view) {
        if (view.needUpdate(that)) {
            view.update(node, that, true);
            return false;
        }
    });
};

// ----------------------------------------------------------------------------------------------------------------- //

