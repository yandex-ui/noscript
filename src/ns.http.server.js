/**
 * Creates and executes http request (a POST request with json return data type by default).
 * @param {string} uri
 * @param {object} params Request parameters.
 * @param {object=} options
 * @returns {Vow.Promise}
 */
ns.http = function(uri, params, options) {
    var request = require('request');

    options = no.extend(ns.H.DEFAULTS, options || {});

    var promise = new Vow.Promise();

    request({
        method: options.type,
        uri: uri,
        json: true,
        body: params
    }, function(error, response, body) {
        if (error) {
            promise.reject({
                error: error
            });
            return;
        }

        promise.fulfill(body);
    });

    return promise;
};
