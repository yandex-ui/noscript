var no = no || {};

// ------------------------------------------------------------------------------------------------------------- //

no.array = {};

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

