var no = no || {};

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

    @param {function} callback
    @return {no.Promise}
*/
no.Promise.prototype.then = function(callback) {
    if (this.rejected) { return; }

    if (this.resolved) {
        callback(this.result);
    } else {
        this.thens.push(callback);
    }

    return this;
};

/**
    Тоже самое, что и then.

    @param {function} callback
    @return {no.Promise}
*/
no.Promise.prototype.else_ = function(callback) {
    if (this.resolved) { return; }

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

    @param {*} result
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

// ----------------------------------------------------------------------------------------------------------------- //

// Можно использовать как модуль для node.js.
if (typeof module === 'object' && module) {
    module.exports = no.Promise;
}

// ----------------------------------------------------------------------------------------------------------------- //

