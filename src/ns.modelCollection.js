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
    if ( this.isValid() ) {
        var items = [];
        if (this.info.split) {
            // массив с хранилищем данных моделей
            items = no.jpath(this.info.split.items, this.data);
            // удаляем все старые данные, но оставляем массив, чтобы сохранить ссылку
            items.splice(0, items.length);
        }

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
    }

    // если модели не удалось засплитить попробуем вставить данные,
    // может в них есть модели
    this.insert(models);

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

        // при обновлении timestamp внутренней модели обновим и у внешней
        model.on('ns-model-touched', function() {
            that.timestamp = this.timestamp;
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
 * Обновляет timestamp'ы модели
 */
ns.ModelCollection.prototype.touch = function() {
    ns.Model.prototype.touch.apply(this, arguments);
    // timestampSelf показывает последнее время изменения внешней модели
    // в то время, как timestamp - последнее время изменения внешней или внутренней модели
    this.timestampSelf = this.timestamp;
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

    index = isNaN(index) ? this.models.length : index;

    // если переданная модель не массив
    if (!(models instanceof Array)) {
        // обернем ее в массив
        models = [models];
    }

    models.forEach(function(model) {
        // вставить можем только модель
        if (ns.Model.info(model.id)) {
            this.models.splice(index, 0, model);
            index++;

            // не забудем подписаться на события
            this._subscribeSplit(model);
        }
    }.bind(this));

    // оповестим всех, что вставили подмодели
    if (models.length) {
        this.trigger('ns-model-insert', models);
    }


    return true;
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
