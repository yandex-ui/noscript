// ------------------------------------------------------------------------------------------------------------- //
// no.array
// ------------------------------------------------------------------------------------------------------------- //

no.array = function(s) {
    return (s instanceof Array) ? s : [ s ];
};

/**
    @param {Array.<string>} array
    @return {Object.<string, boolean>}
*/
no.array.toObject = function(array) {
    var object = {};

    for (var i = 0, l = array.length; i < l; i++) {
        object[ array[i] ] = true;
    }

    return object;
};

/**
    @param {Array} array
    @param {function} filter
    @return {Array}
*/
no.array.grep = function(array, filter) {
    var r = [];

    for (var i = 0, l = array.length; i < l; i++) {
        var value = array[i];
        if (filter(value, i)) {
            r.push(value);
        }
    }

    return r;
};

// ------------------------------------------------------------------------------------------------------------- //

if ( typeof Array.prototype.indexOf === 'function' ) {

    no.array.indexOf = function(array, value) {
        return array.indexOf(value);
    };

} else {

    no.array.indexOf = function(array, value) {
        for (var i = 0, l = array.length; i < l; i++) {
            if ( array[i] === value ) {
                return i;
            }
        }
        return -1;
    };

}

// ------------------------------------------------------------------------------------------------------------- //

/**
    @param {Array} array
    @param {function(*): boolean} condition
    @return {number}
*/
no.array.firstMatch = function(array, condition) {
    for (var i = 0, l = array.length; i < l; i++) {
        if (condition( array[i] )) {
            return i;
        }
    }

    return -1;
};

// ------------------------------------------------------------------------------------------------------------- //

no.array.map = function(array, callback) {
    var r = [];

    for (var i = 0, l = array.length; i < l; i++) {
        r.push( callback( array[i] ) );
    }

    return r;
};

