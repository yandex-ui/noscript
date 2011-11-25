// ----------------------------------------------------------------------------------------------------------------- //
// no.cache
// ----------------------------------------------------------------------------------------------------------------- //

no.cache = {};

no.cache._cache = {};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @typedef {{
        model: no.Model,
        timestamp: number
    }}
*/
no.cache.type_cacheItem;

// ----------------------------------------------------------------------------------------------------------------- //

no.cache.register = function(id, info) {
    no.cache._cache[id] = {};
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} id                  id модели.
    @param {string|Object} key          key или params.
    @return {no.Model.type_cacheItem}   Возвращает соответствующую запись в кэше или null.
*/
no.cache.getRaw = function(id, key) {
    var key = (typeof key === 'string') ? key : no.Model.key(id, key);

    return no.cache._cache[id].items[key] || null;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} id
    @param {string|Object} key
    @return {no.Model}
*/
no.cache.get = function(id, key) {
    var cached = no.cache.getRaw(id, key);
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
no.cache.isCached = function(id, key) {
    var cached = no.cache.getRaw(id, key);
    if (!cached) { return; } // undefined означает, что кэша нет вообще, а false -- что он инвалидный.

    var maxage = cached.model.maxage; // Время жизни модели в милисекундах. После прошествии этого времени, модель будет считаться невалидной.
    if (maxage) {
        var now = +new Date();
        var timestamp = cached.timestamp;

        if (now - timestamp > maxage) {
            return false;
        }
    }

    return true;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {no.Model} model
    @param {number} timestamp
*/
no.cache.set = function(model, timestamp) {
    var id = model.id;
    var key = model.key;

    timestamp || ( timestamp = +new Date() );

    var items = no.cache._cache[id].items;

    if (!items[key]) {
        items[key] = {
            model: model,
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
no.cache.destroy = function(id, key) {
    delete no.cache._cache[id].items[key];
};

/**
    @param {string} id
    @param {function(no.Model) boolean=} condition
*/
no.cache.clear = function(id, condition) {
    if (condition) {
        var items = no.cache._cache[id];
        for (var key in items) {
            if (condition( items[key].model )) {
                no.cache.destroy(id, key);
            }
        }
    } else {
        no.cache._cache[id].items = {};
    }
};

