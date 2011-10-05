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

