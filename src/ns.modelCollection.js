(function() {

var unsubscribe = {};

/**
 * Models collection
 * @namespace
 * @constructor
 * @augments ns.Model
 */
ns.ModelCollection = function() {};

no.inherit(ns.ModelCollection, ns.Model);

ns.ModelCollection.prototype.getData = function() {
    // TODO а точно это нужно? Можно ведь просто всегда взять элементы из collection.models.

    // это составная модель —
    // нужно склеить все данные
    // из моделей её состовляющих
    if (this.isValid()) {
        var jpathItems;

        if (this.info.split) {
            jpathItems = this.info.split.items;
        } else if (this.info.jpathItems) {
            jpathItems = this.info.jpathItems;
        } else {
            jpathItems = '.items';
        }

        // если нет поля data сделаем его
        if (!this.data) {
            this.data = {};
        }

        // делаем нужное поле в .data и делаем его пустым
        no.jpath.set(jpathItems, this.data, []);
        // ссылка куда вставлять данные моделей
        var items = no.jpath(jpathItems, this.data);

        // пишем новые
        this.models.forEach(function(model) {
            items.push( model.getData() );
        });
    }
    return this.data;
};

ns.ModelCollection.prototype._reset = function() {
    ns.Model.prototype._reset.apply(this, arguments);

    this.clear();
};

/**
 * Разбивает данные через jpath описанный в info.split
 * на составные модели
 */
ns.ModelCollection.prototype._beforeSetData = function(data) {
    this.clear();

    var splitInfo = this.info.split;
    if (splitInfo) {
        var items = no.jpath(splitInfo.items, data);
        var models = this._splitModels(items);
        this.insert(models);
    }

    // TODO может быть стоит удалять данные split-а?

    return data;
};

/**
 * Создает модели из разбитых данных
 *
 * @param { Array<Object>} items – массив данных для будущих подмоделей
 * @return { Array<ns.Model> } – массив полученных подмоделей
 */
ns.ModelCollection.prototype._splitModels = function(items) {
    var splitInfo = this.info.split;

    return items.map(function(item) {
        var params = {};
        for (var key in splitInfo.params) {
            params[key] = no.jpath(splitInfo.params[key], item);
        }

        // идентификатор подмодели берется из info.model_id
        // коллецкия может содержать модели только одного вида
        return ns.Model.get(splitInfo.model_id, params).setData(item);
    });
};

/**
 * Подписывает коллекию на события из подмоделей
 *
 * @param {ns.Model} model
 */
ns.ModelCollection.prototype._subscribeSplit = function(model) {
    var that = this;

    var onModelChanged = function(evt, jpath) { that.onItemChanged(evt, model, jpath); };
    var onModelTouched = function(evt) { that.onItemTouched(evt, model); };
    var onModelDestroyed = function(evt) { that.onItemDestroyed(evt, model); };

    model.on('ns-model-change', onModelChanged);
    model.on('ns-model-touched', onModelTouched);
    model.on('ns-model-destroyed', onModelDestroyed);

    unsubscribe[model.key] = function() {
        model.off('ns-model-change', onModelChanged);
        model.off('ns-model-touched', onModelTouched);
        model.off('ns-model-destroyed', onModelDestroyed);
    };
};

ns.ModelCollection.prototype.onItemChanged = function(evt, model, jpath) {
    // Основной смысл этого метода в том, чтобы его можно было переопределить
    // и триггерить изменение коллекции только для части изменений элементов коллекции.

    // TODO тут можно триггерить много чего, но мы пока этого не делаем:
    // this.trigger('ns-model-changed.items[3].some.inner.prop'); // (ЭТОГО СЕЙЧАС НЕТ).

    this.trigger('ns-model-changed', { 'model': model, 'jpath': jpath });
};

ns.ModelCollection.prototype.onItemTouched = function() {
    // TODO почему не this.touch() ?
    this._version++;
};

ns.ModelCollection.prototype.onItemDestroyed = function(evt, model) {
    this.remove(model);
};

/**
 * Returns data version (included items version).
 * @returns {number}
 */
ns.ModelCollection.prototype.getSelfVersion = function() {
    return this._versionSelf;
};

/**
 * Обновляет _version модели
 */
ns.ModelCollection.prototype.touch = function() {
    ns.Model.prototype.touch.apply(this, arguments);

    /**
     * _versionSelf показывает версию изменений внешней модели
     * в то время, как _version - последнее время изменения внешней или внутренней модели
     * @type {*}
     * @private
     */
    this._versionSelf = this._version;
};

/**
 * Удаляет подписку коллекции на подмодель
 * Обязательно при удалении подмодели из коллекции
 *
 * @param {ns.Model} model
 */
ns.ModelCollection.prototype._unsubscribeSplit = function(model) {
    if (model && unsubscribe[model.key]) {
        unsubscribe[model.key]();
    }
};

/**
 * Очищает коллекцию от моделей.
 * Не путать с remove.
 */
ns.ModelCollection.prototype.clear = function() {
    if (this.models) {
        var that = this;
        this.models.forEach(function(model) {
            that._unsubscribeSplit(model);
        });
        this.models = [];
    }
};

/**
 * Вставляет подмодели в коллекцию
 *
 * @param {Array <ns.Model> | ns.Model} models – одна или несколько подмоделей
 *                                                 для вставки
 * @param {Number} [index] – индекс позиции, на которую вставить подмодели
 *
 * @return {Boolean} – признак успешности вставки
 */
ns.ModelCollection.prototype.insert = function(models, index) {
    if (isNaN(index)) {
        index = this.models.length;
    }

    // Для удобства, одиночная модель оборачивается в массив.
    if (!(models instanceof Array)) {
        models = [models];
    }

    // Вставить можно только объявленную модель
    // и повторная вставка модели запрещена
    var insertion = models.filter(function(model) {
        return this.models.indexOf(model) === -1 && ns.Model.infoLite(model.id);
    }, this);

    insertion.forEach(function(model, i) {
        this.models.splice(index + i, 0, model);

        // не забудем подписаться на события
        this._subscribeSplit(model);
    }, this);

    // оповестим всех, что вставили подмодели
    if (insertion.length > 0) {
        // если вставка данных состоялась, считаем модель валидной
        this.status = this.STATUS.OK;

        this.trigger('ns-model-insert', insertion);
        return true;
    } else {
        return false;
    }
};

/**
 * Удаляет подмодели из коллекции
 *
 * @param {ns.Model | Number | Array<ns.Model | Number>} models – подмодели или индексы подмодели, которую надо удалить
 * @return {Boolean} – признак успешности удаления
 */
ns.ModelCollection.prototype.remove = function(models) {
    var modelsRemoved = [];

    if (!Array.isArray(models)) {
        models = [ models ];
    }

    models.forEach(function(modelOrIndex) {
        var index;

        if (isNaN(modelOrIndex)) {
            index = this.models.indexOf(modelOrIndex);
        } else {
            index = modelOrIndex;
        }

        if (index >= 0) {
            var model = this.models[index];

            this._unsubscribeSplit(model);
            modelsRemoved.push(model);
            this.models.splice(index, 1);
        }

    }.bind(this));

    if (modelsRemoved.length) {
        this.trigger('ns-model-remove', modelsRemoved);
        return true;
    }

    return false;
};

})();
