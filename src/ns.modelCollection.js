(function() {

ns.ModelCollection = function() {};

no.inherit(ns.ModelCollection, ns.Model);

ns.ModelCollection.define = function(id, info, base) {
    ns.Model.define(id, info, this);
};

ns.ModelCollection.prototype._reset = function() {
    ns.Model.prototype._reset.apply(this, arguments);
    this.models = [];
}

ns.ModelCollection.prototype._splitData = function(data) {
    var info = this.info.split;

    var items = no.path(info.items, data);

    this.clear();

    var models = this._splitModels(items);

    this.insert(models);
};

ns.ModelCollection.prototype._splitModels = function(items) {
    var info = this.info.split;

    var models = [];

    items.forEach(function(item) {

        var params = {};
        for (var key in info.params) {
            params[key] = no.path(info.params[key], item);
        }

        var model = ns.Model.create(info.model_id, params, item);

        models.push(model);
    });

    return models;
};

ns.ModelCollection.prototype._unsubscribeSplit = function(model) {
    var callbackChange = this._callbackChange;

    if (callbackChange) {
        model.off('changed', callbackChange);
    }

    var info = this.info.split;

    if (info.events) {
        for (var eventName in info.events) {
            var callback = this._callbacksEvents[eventName];
            if (callback) {
                model.off(eventName, callback);
            }
        }
    }
};

ns.ModelCollection.prototype._subscribeSplit = function(model) {

    if (!this._callbackChange) {
        this._callbackChange = this.trigger.bind(this);
    }

    var callbackChange = this._callbackChange;

    model.on('changed', callbackChange);

    var info = this.info.split;

    if (info.events) {
        for (var eventName in info.events) {
            (function() {

                var method = this._getMethod(info.events[eventName]);

                this._callbacksEvents = this._callbacksEvents || {};

                var callback = this._callbacksEvents[eventName];

                if (!callback) {
                    callback = this._callbacksEvents[eventName] = function(data) {
                        method.call(this, model, data);
                    }.bind(this);
                }
                model.on(eventName, callback);

            }.bind(this))();
        }
    }
};

ns.ModelCollection.prototype.clear = function() {

    this.models.forEach(
        this._unsubscribeSplit.bind(this)
    );

    this.models = [];
};

ns.ModelCollection.prototype.insert = function(models, index) {

    index = !isNaN(index) ? index : this.models.length;
    var info = this.info.split;

    if (!(models instanceof Array)) {
        models = [models];
    }

    models.forEach(function(model) {
        if (model instanceof ns.Model && info.model_id === model.id) {
            this.models.splice(index, 0, model);
            index++;

            this._subscribeSplit(model);
        }
    }.bind(this));
};

ns.ModelCollection.prototype.remove = function(needle) {
    var models = this.models;

    for (var index = 0, length = models.length; index < length; index++) {
        var model = this.models[index];
        if (model === needle) {

            this._unsubscribeSplit(model);
            this.models.splice(index, 1);

            return true;
        }
    }

    return false;
};

ns.ModelCollection.prototype._getMethod = function(method) {
    if (typeof method === 'string') {
        method = this[method];
    }

    if (typeof method !== 'function') {
        throw new Error("[ns.View] Can't find method '" + method + "' in '" + this.id + "'");
    }

    return method;
};

})();
