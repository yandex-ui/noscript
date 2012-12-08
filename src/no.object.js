no.object = {};

no.object.clone = function(obj) {
    if (obj && typeof obj === 'object') {
        var r;

        if ( Array.isArray(obj) ) {
            r = [];
            for (var i = 0; i < obj.length; i++) {
                r.push( no.object.clone( obj[i] ) );
            }
        } else {
            r = {};
            for (var key in obj) {
                r[key] = no.object.clone( obj[key] );
            }
        }

        return r;
    }

    return obj;
};

/**
    @param {!Object} obj
    @return {boolean} Определяет, пустой ли объект или нет.
*/
no.object.isEmpty = function(obj) {
    for (var key in obj) {
        return false;
    }

    return true;
};

