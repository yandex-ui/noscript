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

