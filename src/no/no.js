// ------------------------------------------------------------------------------------------------------------- //
// no
// ------------------------------------------------------------------------------------------------------------- //

var no = {};

// ------------------------------------------------------------------------------------------------------------- //

no.inherits = function(child, parent) {
    var F = function() {};
    F.prototype = parent.prototype;
    child.prototype = new F();
    child.prototype.constructor = child;
};

// ------------------------------------------------------------------------------------------------------------- //

/**
    @param {!Object} dest
    @param {...!Object} srcs
    @return {!Object}
*/
no.extend = function(dest) {
    var srcs = [].slice.call(arguments, 1);

    for (var i = 0, l = srcs.length; i < l; i++) {
        var src = srcs[i];
        for (var key in src) {
            dest[key] = src[key];
        }
    }

    return dest;
};

// ------------------------------------------------------------------------------------------------------------- //

/**
    Пустая функция. No operation.
*/
no.pe = function() {};

