// ------------------------------------------------------------------------------------------------------------- //
// no.http
// ------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} url
    @param {object} params
    @param {string='POST'} type
    @param {string='json'} dataType
    @return {no.Promise}
*/
no.http = function(url, params, type, dataType) {
    var promise = new no.Promise();

    $.ajax({
        url: url,
        type: type || 'POST',
        data: params,
        dataType: dataType || 'json',
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

