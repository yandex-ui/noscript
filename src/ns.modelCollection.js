(function() {

/**
 * Models collection
 * @namespace
 * @constructor
 * @augments ns.Model
 */
ns.ModelCollection = function() {};

no.inherit(ns.ModelCollection, ns.Model);

ns.ModelCollection.prototype.getData = function() {
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
 * Регистрирует обработчики событий.
 * @private
 */
ns.ModelCollection.prototype._bindEvents = function() {
    ns.Model.prototype._bindEvents.apply(this, arguments);

    // При уничтожении вложенной модели коллекция выносит останки.
    this.on('ns-model-destroyed', function(e, data) {
        // Убедимся, что удалился именно элемент коллекции, а не сама коллекция.
        // Пока это возможно только по наличию data.model в аргументах
        if (data && data.model) {
            this.remove(data.model);
        }
    });
};

/**
 * Разбивает данные через jpath описанный в info.split
 * на составные модели
 */
ns.ModelCollection.prototype._setData = function(data) {
    this.clear();

    var info = this.info.split;
    var models = data;
    if (info) {
        var items = no.jpath(info.items, data);
        models = this._splitModels(items);
        this.insert(models);
    }

    return data;
};

/**
 * Создает модели из разбитых данных
 *
 * @param { Array <JSON>} items – массив данных для будущих подмоделей
 * @return { Array <ns.Model> } – массив полученных подмоделей
 */
ns.ModelCollection.prototype._splitModels = function(items) {
    var info = this.info.split;
    var that = this;

    var models = [];

    items.forEach(function(item) {

        var params = {};
        for (var key in info.params) {
            params[key] = no.jpath(info.params[key], item);
        }

        // идентификатор подмодели берется из info.model_id
        // он коллецкия может содержать модели только одного вида
        var model = ns.Model.get(info.model_id, params).setData(item);

        model.on('ns-model-touched', function() {
            // increment modelCollection version on collection-item update
            that._version++;
        });

        models.push(model);
    });

    return models;
};

/**
 * Подписывает коллекию на события из подмоделей
 *
 * @param {ns.Model} model
 */
ns.ModelCollection.prototype._subscribeSplit = function(model) {

    // добавим нашу коллекцию с список слушающих коллекций для подмодели
    model.eventListeners[this.key] = this;

    // если ранее мы не переопределяли прототипный тригер
    // то переопеделим его
    if (ns.Model.prototype.trigger === model.trigger) {
        model.trigger = function(evt, data) {
            ns.Model.prototype.trigger.call(this, evt, data);

            var collData = {
                data: data,
                model: this
            };

            for (var key in this.eventListeners) {
                var collection = this.eventListeners[key];
                if (collection) {
                    collection.trigger(evt, collData);
                }
            }
        };
    }
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
    delete model.eventListeners[this.key];
};

/**
 * Удаляет все подмодели из коллекции
 * С каждой модели происходит снятие подписки
 */
ns.ModelCollection.prototype.clear = function() {

    this.models = this.models || [];

    this.models.forEach(
        this._unsubscribeSplit.bind(this)
    );

    this.models = [];
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
        // если данных не было, при insert говорим что данные появились
        if (this.status == this.STATUS.NONE) {
            this.status = this.STATUS.OK;
        }

        this.trigger('ns-model-insert', insertion);
        return true;
    } else {
        return false;
    }
};

/**
 * Удаляет подмодель из коллекции
 *
 * @param {ns.Model | Number | Array<ns.Model | Number>} models – подмодели или индексы подмодели, которую надо удалить
 * @return {Boolean} – признак успешности удаления
 */
ns.ModelCollection.prototype.remove = function(models) {

    var modelsRemoved = [];

    if (!(models instanceof Array)) {
        models = [models];
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

            // не забудем отписаться от событий подмодели
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
