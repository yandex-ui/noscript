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

no.pe = function() {};

// ------------------------------------------------------------------------------------------------------------- //

/**
    @param {!Object} obj
    @return {Array.<string>} Возвращает список всех ключей объекта.
*/
no.keys = function(obj) {
    var keys = [];

    for (var key in obj) {
        keys.push(key);
    }

    return keys;
};

/**
    @param {!Object} obj
    @return {boolean} Определяет, пустой ли объект или нет.
*/
no.isEmpty = function(obj) {
    for (var key in obj) {
        return false;
    }

    return true;
};

no.object = {};

no.object.merge = function(to, from) {
    var o = {};

    for (var key in from) {
        if (key.charAt(0) === '_') { // Не учитывать служебные параметры при merge'е объектов.
            continue;
        }

        var toValue = to[key];
        var fromValue = from[key];

        if (toValue === undefined || toValue === fromValue) {
            o[key] = fromValue;
        } else {
            return false;
        }
    }

    return o;
};

no.http = function(url, params) {
    var promise = new no.Promise();

    $.ajax({
        url: url,
        data: params,
        dataType: 'json',
        success: function(data) {
            promise.resolve(data);
        }
    });

    return promise;
};

