/**
    Do-model is a model, that performs some action and that is also not stored in cache.
    @constructor
    @param {string} id
    @param {Object} params
    @param {Object=} data
*/
no.DoModel = function(id, params, data) {
    this.init(id, params, data);
    this.key = no.DoModel.key();
};

no.inherits(no.DoModel, no.Model);

// ----------------------------------------------------------------------------------------------------------------- //

no.DoModel._keySuffix = 0;

/**
 * Generate key for newly created do-model.
 * @return {String} Key in format "do-<number>".
 */
no.DoModel.key = function() {
    return "do-" + no.DoModel._keySuffix++;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
 * @return {Boolean} Always return false: do not allow to request the same do model twice.
 */
no.DoModel.prototype.canRetry = function() {
    return false;
};