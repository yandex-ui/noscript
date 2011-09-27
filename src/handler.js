// ----------------------------------------------------------------------------------------------------------------- //
// no.Handler
// ----------------------------------------------------------------------------------------------------------------- //

/**
    @constructor
    @param {string} id
    @param {no.Handler.type_info} info
*/
no.Handler = function(id, info) {
    this.id = id;
    this.info = info;

    /** @type { Object.<string, no.Handler.type_cacheItem> } */
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
no.Handler.type_cacheItem;

/**
    @typedef {function(
        new:no.Handler,
        string,
        no.Handler.type_info
    )}
*/
no.Handler.type_create;

/**
    @typedef {{
        params: !Object
    }}
*/
no.Handler.type_info;

// ----------------------------------------------------------------------------------------------------------------- //

/** @type { Object.<string, no.Handler.type_create> } */
no.Handler._classes = {};

/** @type { Object.<string, no.Handler.type_info> } */
no.Handler._infos = {};

/** @type { Object.<string, no.Handler> } */
no.Handler._instances = {};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} id
    @param {no.Handler.type_info=} info
    @param {no.Handler.type_create=} class_
    @return {no.Handler}
*/
no.Handler.register = function(id, info, class_) {
    info = info || {};

    no.Handler._infos[id] = info;
    no.Handler._classes[id] = class_ || no.Handler;

    info.params = info.params || {};
    info.retries = info.retries || 3;

    info._keyParams = no.keys(info.params).sort();
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} id
    @return {no.Handler.type_info}
*/
no.Handler.getInfo = function(id) {
    return no.Handler._infos[id];
};

/**
    @param {string} id
    @return {no.Handler}
*/
no.Handler.get = function(id) {
    var handler = no.Handler._instances[id];

    if (!handler) {
        var info = no.Handler._infos[id];
        var class_ = no.Handler._classes[id];
        handler = no.Handler._instances[id] = new class_(id, info);
    }

    return handler;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {!Object} params
    @return {string}
*/
no.Handler.prototype.getKey = function(params) {
    var defaultParams = this.info.params;
    var keyParams = this.info._keyParams;

    var key = 'handler=' + this.id;

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
    @return {no.Handler.type_cacheItem}
*/
no.Handler.prototype.getRawCache = function(key) {
    return this._cache[key];
};

/**
    @param {!Object} params
    @return {no.Handler.type_cacheItem}
*/
no.Handler.prototype.getRawCacheByParams = function(params) {
    var key = this.getKey(params);
    return this._cache[key];
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} key
    @return {Object}
*/
no.Handler.prototype.getCache = function(key) {
    var cached = this._cache[key];
    if (cached) {
        return cached.data;
    }
};

/**
    @param {!Object} params
    @return {Object}
*/
no.Handler.prototype.getCacheByParams = function(params) {
    var key = this.getKey(params);
    return this.getCache(key);
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} key
    @return {(boolean|undefined)}
*/
no.Handler.prototype.isCached = function(key) {
    var cached = this._cache[key];
    if (!cached) { return; } // undefined означает, что кэша нет вообще никакого, а false, что есть, но уже неактуальный.


    var maxage = this.options.maxage; // Время жизни кэша в милисекундах. После прошествии этого времени, кэш будет считаться невалидным.
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
no.Handler.prototype.setCache = function(key, data, params, timestamp, noforce) {
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

no.Handler.prototype.onsetcache = no.pe;

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} key
*/
no.Handler.prototype.unCache = function(key) {
    delete this._cache[key];
};

/**
    @param {function(string, no.Handler.type_cacheItem) boolean=} condition
*/
no.Handler.prototype.clearCache = function(condition) {
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
no.Handler.prototype.touch = function(key, timestamp) {
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
no.Handler.prototype.hasErrors = function(data) {
    return data && data.error;
};

/**
    @param {Object} error
    @return {boolean}
*/
no.Handler.prototype.needRetry = function(error) {
    return true;
};

// ----------------------------------------------------------------------------------------------------------------- //

