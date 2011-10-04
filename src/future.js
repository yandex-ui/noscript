no.Future = function(worker) {
    this.worker = worker;
};

no.Future.prototype.run = function(params) {
    var promise = new no.Promise();

    this.worker(promise, params);

    return promise;
};

no.Future.wait = function(futures) {
    var future = new no.Future();

    future.run = function(promise, params) {
        var promises = [];
        for (var i = 0, l = futures.length; i < l; i++) {
            promises.push( futures[i].run(params) );
        }
        return no.Promise.wait( promises );
    };

    return future;
};

no.Future.seq = function(futures) {
    var future = new no.Future();

    future.run = function(promise, params) {
        for (var i = 0, l = futures.length; i < l; i++) {
            var future = futures[i];
        }
    };

    return future;
};

