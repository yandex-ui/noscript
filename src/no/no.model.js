// ----------------------------------------------------------------------------------------------------------------- //
// no.Model
// ----------------------------------------------------------------------------------------------------------------- //

/**
    @constructor
    @param {string} id
    @param {no.Model.type_info} info
*/
no.Model = function(id, info) {
    this.id = id;
    this.info = info;

    /** @type { Object.<string, no.Model.type_cacheItem> } */
    this._cache = {};
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @typedef {{
        data: Object,
        timestamp: number,
        params: !Object
    }}
*/
no.Model.type_cacheItem;

/**
    @typedef {function(
        new:no.Model,
        string,
        no.Model.type_info
    )}
*/
no.Model.type_create;

/**
    @typedef {{
        params: !Object
    }}
*/
no.Model.type_info;

// ----------------------------------------------------------------------------------------------------------------- //

/** @type { Object.<string, no.Model.type_create> } */
no.Model._classes = {};

/** @type { Object.<string, no.Model.type_info> } */
no.Model._infos = {};

/** @type { Object.<string, no.Model> } */
no.Model._instances = {};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} id
    @param {no.Model.type_info=} info
    @param {no.Model.type_create=} class_
    @return {no.Model}
*/
no.Model.register = function(id, info, class_) {
    info = info || {};

    no.Model._infos[id] = info;
    no.Model._classes[id] = class_ || no.Model;

    info.params = info.params || {};
    info.retries = info.retries || 3;

    info._keyParams = no.object.keys(info.params).sort();
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} id
    @return {no.Model.type_info}
*/
no.Model.getInfo = function(id) {
    return no.Model._infos[id];
};

/**
    @param {string} id
    @return {no.Model}
*/
no.Model.get = function(id) {
    var model = no.Model._instances[id];

    if (!model) {
        var info = no.Model._infos[id];
        var class_ = no.Model._classes[id];
        model = no.Model._instances[id] = new class_(id, info);
    }

    return model;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {!Object} params
    @return {string}
*/
no.Model.prototype.getKey = function(params) {
    var defaultParams = this.info.params;
    var keyParams = this.info._keyParams;

    var key = 'model=' + this.id;

    for (var i = 0, l = keyParams.length; i < l; i++) {
        var pName = keyParams[i];
        var pValue = params[pName];
        if (pValue && pValue !== defaultParams[pName]) {
            key += '&' + pName + '=' + pValue;
        }
    }

    return key;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} key
    @return {no.Model.type_cacheItem}
*/
no.Model.prototype.getRawCache = function(key) {
    return this._cache[key];
};

/**
    @param {!Object} params
    @return {no.Model.type_cacheItem}
*/
no.Model.prototype.getRawCacheByParams = function(params) {
    var key = this.getKey(params);
    return this._cache[key];
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} key
    @return {Object}
*/
no.Model.prototype.getCache = function(key) {
    var cached = this._cache[key];
    if (cached) {
        return cached.data;
    }
};

/**
    @param {!Object} params
    @return {Object}
*/
no.Model.prototype.getCacheByParams = function(params) {
    var key = this.getKey(params);
    return this.getCache(key);
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} key
    @return {(boolean|undefined)}
*/
no.Model.prototype.isCached = function(key) {
    var cached = this._cache[key];
    if (!cached) { return; } // undefined означает, что кэша нет вообще никакого, а false, что есть, но уже неактуальный.


    var maxage = this.info.maxage; // Время жизни кэша в милисекундах. После прошествии этого времени, кэш будет считаться невалидным.
    if (maxage) {
        var now = +new Date();
        var timestamp = cached.timestamp;

        if (now - timestamp > maxage) { return false; }
    }

    return true;
};

/**
    @param {string} key
    @param {Object} data
    @param {!Object} params
    @param {number} timestamp
    @param {boolean=} noforce
*/
no.Model.prototype.setCache = function(key, data, params, timestamp, noforce) {
    var cached = this._cache[key];

    if (!cached) {
        this._cache[key] = {
            data: data,
            timestamp: timestamp,
            params: params
        };
    } else if (!noforce) { // Если noforce, то не перезаписываем уже существующий кэш.
        cached.data = data;
        cached.timestamp = timestamp;
        // cached.params не перезаписываем никогда, т.к. они не могут измениться.
    }

    this.onsetcache(key, data, params); // Возможность что-нибудь сделать с новым значением кэша.
};

no.Model.prototype.onsetcache = no.pe;

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} key
*/
no.Model.prototype.unCache = function(key) {
    delete this._cache[key];
};

/**
    @param {function(string, no.Model.type_cacheItem) boolean=} condition
*/
no.Model.prototype.clearCache = function(condition) {
    if (condition) {
        var cache = this._cache;
        for (var key in cache) {
            if (condition(key, cache[key])) {
                this.unCache(key);
            }
        }
    } else {
        this._cache = {};
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} key
    @param {number=} timestamp
*/
no.Model.prototype.touch = function(key, timestamp) {
    timestamp = timestamp || +new Date();

    if (key) {
        var cached = this._cache[key];
        if (cached) {
            cached.timestamp = timestamp;
        }
    } else {
        var cache = this._cache;
        for (var key in cache) {
            cache.timestamp = timestamp;
        };
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {Object} data
    @return {boolean}
*/
no.Model.prototype.hasErrors = function(data) {
    return !!(data && data.error);
};

/**
    @param {Object} error
    @return {boolean}
*/
no.Model.prototype.needRetry = function(error) {
    return true;
};

// ----------------------------------------------------------------------------------------------------------------- //

