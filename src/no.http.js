// ------------------------------------------------------------------------------------------------------------- //
// no.http
// ------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} url
    @param {Object} params
    @param {String} type
    @return {no.Promise}
*/
no.http = function(url, params, type) {
    var promise = new no.Promise();

    $.ajax({
        url: url,
        type: type || 'POST',
        data: params,
        dataType: 'json',
        success: function(data) {
            promise.resolve(data);
        },
        error: function(jqXHR, textStatus, errorThrown) {
            var error = errorThrown || textStatus || 'some error';
            promise.resolve({ error: error });
        }
    });

    return promise;
};

