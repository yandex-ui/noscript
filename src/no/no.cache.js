// ----------------------------------------------------------------------------------------------------------------- //
// no.Cache
// ----------------------------------------------------------------------------------------------------------------- //

no.Cache = {};

no.Cache._cache = {};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @typedef {{
        model: no.Model,
        timestamp: number
    }}
*/
no.Cache.type_cacheItem;

// ----------------------------------------------------------------------------------------------------------------- //

no.Cache.register = function(id, info) {
    no.Cache._cache[id] = {
        items: {},
        maxage: info.maxage
    };
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} id                  id модели.
    @param {string|Object} key          key или params.
    @return {no.Model.type_cacheItem}   Возвращает соответствующую запись в кэше или null.
*/
no.Cache.getRaw = function(id, key) {
    var key = (typeof key === 'string') ? key : no.Model.key(id, key);

    return no.Cache._cache[id].items[key] || null;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} id
    @param {string|Object} key
    @return {no.Model}
*/
no.Cache.get = function(id, key) {
    var cached = no.Cache.get(id, key);
    if (cached) {
        return cached.model;
    }

    return null;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} id
    @param {string|Object} key
    @return {(boolean|undefined)}
*/
no.Cache.isCached = function(id, key) {
    var cached = no.Cache.getRaw(id, key);
    if (!cached) { return; } // undefined означает, что кэша нет вообще, а false -- что он инвалидный.

    var maxage = cached.maxage; // Время жизни кэша в милисекундах. После прошествии этого времени, кэш будет считаться невалидным.
    if (maxage) {
        var now = +new Date();
        var timestamp = cached.timestamp;

        if (now - timestamp > maxage) { return false; }
    }

    return true;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {no.Model} model
    @param {number} timestamp
*/
no.Cache.set = function(model, timestamp) {
    var id = model.id;
    var key = model.key;

    timestamp || ( timestamp = +new Data() );

    var cached = no.Cache.getRaw(id, key);

    if (!cached) {
        this._cache[id].items[key] = {
            model: data,
            timestamp: timestamp
        };
    } else {
        cached.model.setData( model.data );
        cached.timestamp = timestamp;
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} id
    @param {string} key
*/
no.Cache.unCache = function(id, key) {
    delete no.Cache._cache[id].items[key];
};

/**
    @param {string} id
    @param {function(no.Model) boolean=} condition
*/
no.Cache.clearCache = function(id, condition) {
    if (condition) {
        var items = no.Cache._cache[id];
        for (var key in items) {
            if (condition( items[key].model )) {
                no.Cache.unCache(id, key);
            }
        }
    } else {
        no.Cache._cache[id].items = {};
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    FIXME: Зачем это нужно?

    @param {string} key
    @param {number=} timestamp
no.Cache.touch = function(key, timestamp) {
    timestamp = timestamp || +new Date();

    if (key) {
        var cached = this._cache[key];
        if (cached) {
            cached.timestamp = timestamp;
        }
    } else {
        var cache = this._cache;
        for (var item_key in cache) {
            cache[item_key].timestamp = timestamp;
        }
    }
};
*/


