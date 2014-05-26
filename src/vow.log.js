// небольшая обертка для Vow.Promise, позволяющая логировать все исключения через стандартные механизмы ns
Vow.Promise.prototype.__reject = Vow.Promise.prototype.reject;
Vow.Promise.prototype.reject = function(err) {
    if (err instanceof Error) {
        ns.log.exception('promise.exception', err);
    }
    this.__reject(err);
};
