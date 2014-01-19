ns.mixins = {};

ns.mixins.BindModel = {
    _bindModel: function(model, eventName, callback) {
        // Create hash for model events if not already.
        if (!this._modelsEvents) {
            this._modelsEvents = {};
        }

        model.on(eventName, callback);

        // Model specific hash of events callbacks.
        var events = (this._modelsEvents[model.key] || (this._modelsEvents[model.key] = {}));
        events[eventName] = callback;
    },

    _unbindModel: function(model) {
        if (this._modelsEvents && model.key in this._modelsEvents) {
            var events = this._modelsEvents[model.key];

            for (var eventName in events) {
                model.off(eventName, events[eventName]);
            }

            delete this._modelsEvents[model.key];
        }
    }
};
