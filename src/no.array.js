var no;
if (typeof window === 'undefined') {
    no = require('./no.js');
} else {
    no = no || {};
}

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
no.array.grep = function(array, filter) { // TODO это наверное всё-таки filter?
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
        r.push( callback( array[i], i ) );
    }

    return r;
};

no.array.equal = function(ar1, ar2) {
    if (ar1 === ar2) {
        return true;
    }
    if (ar1.length !== ar2.length) {
        return false;
    }
    for (var i = 0; i < ar1.length; i++) {
        if (ar1[i] !== ar2[i]) {
            return false;
        }
    }
    return true;
}

no.array.forEach = function(ar, callback) {
    for (var i = 0; i < ar.length; i++) {
        callback(ar[i], i);
    }
}

no.array.has = function(ar, value) {
    for (var i = 0; i < ar.length; i++) {
        if (ar[i] === value) {
            return true;
        }
    }
    return false;
}

no.array.create = function(count, creator) {
    var ar = [];
    for (var i = 0; i < count; i++) {
        ar.push(creator(i));
    }
    return ar;
}

no.array.clone = function(ar) {
    var new_ar = [];
    for (var i = 0; i < ar.length; i++) {
        new_ar[i] = ar[i];
    }
    return new_ar;
}

/*
    Returns a new array with unique values.
    For primitive types only.
    @param {Array.<string|number>} ar Array of values.
*/
no.array.uniq = no.array.unique = function(ar) {
    var ready = [];
    var val;

    for (var i = 0; i < ar.length; i++) {
        val = ar[i];
        if (no.array.indexOf(ready, val) < 0) {
            ready.push(val);
        }
    }
    return ready;
};

//  ---------------------------------------------------------------------------------------------------------------  //

