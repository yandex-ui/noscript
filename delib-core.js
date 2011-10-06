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
// no.array
// ------------------------------------------------------------------------------------------------------------- //

no.array = {};

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

// ----------------------------------------------------------------------------------------------------------------- //

var de = {};

// ----------------------------------------------------------------------------------------------------------------- //

var node = {};

/** @type {nodeFs} */
node.fs = require('fs');

/** @type {nodeHttp} */
node.http = require('http');

/** @type {nodePath} */
node.path = require('path');

/** @type {nodeUrl} */
node.url = require('url');

/** @type {nodeUtil} */
node.util = require('util');

/** @type {nodeVm} */
node.vm = require('vm');

/** @type {nodeQueryString} */
node.querystring = require('querystring');

// ----------------------------------------------------------------------------------------------------------------- //
// de.file
// ----------------------------------------------------------------------------------------------------------------- //

de.file = {};

// ----------------------------------------------------------------------------------------------------------------- //

de.file._cache = {};

de.file.get = function(filename) {
    var promise = de.file._cache[filename];

    if (!promise) {
        promise = de.file._cache[filename] = new no.Promise();

        node.fs.readFile(filename, function(error, content) {
            if (error) {
                delete de.file._cache[filename]; // Если не удалось считать файл, в следующий раз нужно повторить попытку,
                                                 // а не брать из кэша ошибку.
                promise.reject({
                    'id': 'FILE_OPEN_ERROR',
                    'message': error.message
                });
            } else {
                de.file.watch(filename); // Содержимое файла закэшировано внутри promise'а. Следим, не изменился ли файл.
                promise.resolve(content);
            }

        });
    }

    return promise;
};

no.events.bind('file-changed', function(e, filename) { // Файл изменился, выкидываем его из кэша.
    /** @type {string} */ filename;

    delete de.file._cache[ filename ];

    // FIXME: Не нужно ли тут делать еще и unwatch?
});

// ----------------------------------------------------------------------------------------------------------------- //

de.file._watched = {};

de.file.watch = function(filename) {
    if (!de.file._watched[ filename ]) { // FIXME: Непонятно, как это будет жить, когда файлов будет много.
        de.file._watched[ filename ] = true;

        node.fs.watchFile(filename, function (/** @type {{mtime: Date}} */ curr, /** @type {{mtime: Date}} */ prev) {
            if (prev.mtime !== curr.mtime) {
                no.events.trigger('file-changed', filename);
            }
        });
    }
};

de.file.unwatch = function(filename) {
    if (de.file._watched[ filename ]) {
        delete de.file._watched[ filename ];
        node.fs.unwatchFile(filename);
    }
};

// ----------------------------------------------------------------------------------------------------------------- //
// de.http
// ----------------------------------------------------------------------------------------------------------------- //

de.http = {};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} url
    @param {Object=} params
    @return {!Object}
*/
de.http.url2options = function(url, params) {
    url = node.url.parse(url, true);

    var query = url.query || {};
    if (params) {
        de.util.extend(query, params);
    }

    return {
        'host': url.hostname,
        'path': node.url.format({
            'pathname': url.pathname,
            'query': query
        }),
        'port': url.port || 80
    };
};

// ----------------------------------------------------------------------------------------------------------------- //

de.http.errorMessages = {
    '400': 'Bad Request',
    '403': 'Forbidden',
    '404': 'Not Found',
    '500': 'Internal Server Error',
    '503': 'Service Unavailable'
};

// ----------------------------------------------------------------------------------------------------------------- //

de.http.get = function(url) {
    var promise = new no.Promise();

    de.http._get(url, promise, 0);

    return promise;
};

de.http._get = function(options, promise, count) {
    var data = [];

    var req = node.http.request( options, function(res) {
        var headers = res.headers;
        var status = res.statusCode;

        var error;
        switch (status) {
            case 301:
            case 302:
                if (count > 3) { // FIXME: MAX_REDIRECTS.
                    return promise.reject({
                        'id': 'HTTP_TOO_MANY_REDIRECTS'
                    });
                }

                var location = headers['location'];
                var redirect = de.http.url2options(location);
                if (!redirect.host) {
                    redirect.host = options.host;
                }
                return de.http._get(redirect, promise, count + 1);

            case 400:
            case 403:
            case 404:
            case 500:
            case 503:
                error = {
                    'id': 'HTTP_' + status,
                    'message': de.http.errorMessages[status]
                };
                break;

            // TODO: default:
        }

        if (error) {
            promise.reject(error);

        } else {
            res.on('data', function(chunk) {
                data.push(chunk);
            });
            res.on('end', function() {
                promise.resolve(data);
            });
            res.on('close', function(error) {
                promise.reject({
                    'id': 'HTTP_CONNECTION_CLOSED',
                    'message': error.message
                });
            });

        }
    } );

    req.on('error', function(error) {
        promise.reject({
            'id': 'HTTP_UNKNOWN_ERROR',
            'message': error.message
        });
    });

    req.end();
};

