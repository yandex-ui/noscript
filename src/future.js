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

