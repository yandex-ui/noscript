// ----------------------------------------------------------------------------------------------------------------- //
// no.Model
// ----------------------------------------------------------------------------------------------------------------- //

/*  TODO:

  * Непонятно, как апдейтить несколько разных моделей и не генерить события для всех этих изменений.
  * Garbage collector.

*/

/**
    @constructor
    @param {string} id
    @param {Object} params
    @param {Object=} data
*/
no.Model = function(id, params, data) {
    this.init(id, params, data);
};

/**
    @param {string} id
    @param {Object} params
    @param {Object=} data
*/
no.Model.prototype.init = function(id, params, data) {
    this.id = id;
    this.params = params;
    this.setData(data);

    var info = this.info = no.Model._infos[id];

    this.key = no.Model.key(id, params, info);

    this._changes = [];
};

// ----------------------------------------------------------------------------------------------------------------- //

// Typedefs.

/**
    @typedef {function(
        new:no.Model,
        string,
        Object,
        Object=
    )}
*/
no.Model.type_class;

/**
    @typedef {{
        id: string,
        keyParams: Object,
        reqParams: Object
    }}
*/
no.Model.type_info;

// ----------------------------------------------------------------------------------------------------------------- //

/** @type { Object.<string, no.Model.type_class> } */
no.Model._classes = {};

/** @type { Object.<string, no.Model.type_info> } */
no.Model._infos = {};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string | no.Model.type_info} info
    @param {no.Model.type_class=} class_
*/
no.Model.register = function(info, class_) {
    if (typeof info === 'string') {
        info = {
            'id': info
        };
    }

    var keyParams = info.keyParams = info.keyParams || {};
    info.reqParams = info.reqParams || keyParams;

    info.keysOrder = no.object.keys(keyParams).sort();

    var id = info.id;

    no.Model._infos[id] = info;
    no.Model._classes[id] = class_ || no.Model;

    no.Model._cache[id] = {};
};

/**
    @param {string} id
    @param {Object} params
    @param {Object=} data
    @return {no.Model}
*/
no.Model.create = function(id, params, data) {
    var class_ = no.Model._classes[id];

    return new class_(id, params, data);
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} id
    @return {no.Model.type_info}
*/
no.Model.info = function(id) {
    return no.Model._infos[id];
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} id
    @param {!Object} params
    @param {no.Model.type_info=} info
    @return {string}
*/
no.Model.key = function(id, params, info) {
    info || ( info = no.Model._infos[id] );

    var keyParams = info.keyParams;
    var keysOrder = info.keysOrder;

    var key = 'model=' + id;

    for (var i = 0, l = keysOrder.length; i < l; i++) {
        var pName = keysOrder[i];
        var pValue = params[pName] || keyParams[pName];
        if (pValue) {
            key += '&' + pName + '=' + pValue;
        }
    }

    return key;
};

// ----------------------------------------------------------------------------------------------------------------- //

no.Model.prototype.isValid = function() {
    return !!this.data;
};

no.Model.prototype.invalidate = function() {
    this.data = null;
};

// ----------------------------------------------------------------------------------------------------------------- //

no.Model.prototype.get = function(path) {
    return no.path.get( path, this.data );
};

no.Model.prototype.set = function(path, value, options) {
    options || ( options = {}; );

    var oldValue = no.path( path, this.data, value );

    if (!no.object.isEqual( value, oldValue )) {
        this._changes.push({
            path: path,
            before: oldValue,
            after: value
        });
        if (!options.silent) {
            this.change();
        }
    }
};

no.Model.prototype.getData = function() {
    return this.data;
};

no.Model.prototype.setData = function(data, options) {
    options || ( options = {}; );

    if (data) {
        var oldData = this.data;
        this.data = this.preprocessData(data);

        // FIXME: Копипаст из set().
        if (!no.object.isEqual(data, oldData)) {
            this._changes.push({
                path: '',
                before: oldData,
                after: data
            });
            if (!options.silent) {
                this.change();
            }
        }
    }
};

no.Model.prototype.preprocessData = function(data) {
    return data;
};

// ----------------------------------------------------------------------------------------------------------------- //

no.Model.prototype.processParams = function(params) {
    return params;
};

// ----------------------------------------------------------------------------------------------------------------- //

no.Model.prototype.getReqParams = function() {
    var params = this.params;

    var reqParams = this.info.reqParams;
    var reqParams_ = {};

    for (var pName in reqParams) {
        var pValue = params[pName];
        if (reqParams[pName] === true && pValue == null) { // true означает, что параметр обязательный.
            return null;
        }
        reqParams_[pName] = pValue;
    }

    return reqParams_;
};

no.Model.prototype.change = function() {
    var changes = this._changes;
    this._changes = [];

    no.events.trigger('model.change', {
        key: this.key,
        changes: changes
    });
};

// ----------------------------------------------------------------------------------------------------------------- //
// Кэширующие методы для no.Model.
// ----------------------------------------------------------------------------------------------------------------- //

no.Model._cache = {};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @typedef {{
        model: no.Model,
        timestamp: number
    }}
*/
no.Model.type_cacheItem;

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} id                  id модели.
    @param {string|Object} key          key или params.
    @return {no.Model.type_cacheItem}   Возвращает соответствующую запись в кэше или null.
*/
no.Model.getRaw = function(id, key) {
    var key = (typeof key === 'string') ? key : no.Model.key(id, key);

    return no.Model._cache[id].items[key] || null;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} id
    @param {string|Object} key
    @return {no.Model}
*/
no.Model.get = function(id, key) {
    var cached = no.Model.getRaw(id, key);
    if (cached) {
        return cached.model;
    }

    return null;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {no.Model} model
    @param {number=} timestamp
*/
no.Model.set = function(model, timestamp) {
    var id = model.id;
    var key = model.key;

    timestamp || ( timestamp = +new Date() );

    var items = no.Model._cache[id].items;

    var cached = items[key];
    if (!cached) {
        items[key] = {
            model: model,
            timestamp: timestamp
        };
    } else { // FIXME: А может нужно просто менять модель на новую и все?
        cached.model.data = model.data;
        cached.timestamp = timestamp;
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} id
    @param {string|Object} key
    @return {(boolean|undefined)}
*/
no.Model.isValid = function(id, key) {
    var cached = no.Model.getRaw(id, key);
    if (!cached) { return; } // undefined означает, что кэша нет вообще, а false -- что он инвалидный.

    return cached.model.isValid();
};

