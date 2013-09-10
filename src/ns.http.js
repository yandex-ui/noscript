// ------------------------------------------------------------------------------------------------------------- //
// ns.http
// ------------------------------------------------------------------------------------------------------------- //

/**
    Creates and executes ajax request (a POST request with json return data type by default).
    @param {string} url
    @param {object} params Request parameters.
    @param {object=} options Standart jQuery.ajax settings object.
    @return {no.Promise}
*/
ns.http = function(url, params, options) {
    options = no.extend({ type: 'POST', dataType: 'json' }, options || {});
    options.url = url;
    options.data = params;

    var promise = new no.Promise();
    $.ajax(options)
        .done(function(data) {
            promise.resolve(data);
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            var error = errorThrown || textStatus || 'unknown error';
            promise.resolve({
                error: error,
                xhr: jqXHR
            });
        });

    return promise;
};
