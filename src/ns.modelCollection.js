(function() {

ns.ModelCollection = function() {};

no.inherit(ns.ModelCollection, ns.Model);

ns.ModelCollection.prototype.getData = function() {
    // это составная модель —
    // нужно склеить все данные
    // из моделей её состовляющих
    if ( this.isValid() ) {
        // массив с хранилищем данных моделей
        var items = no.path(this.info.split.items, this.data);
        // удаляем все старые данные, но оставляем массив, чтобы сохранить ссылку
        items.splice(0, items.length);
        // пишем новые
        this.models.forEach(function(model) {
            items.push( model.getData() );
        });
    }

    return this.data;
};


/**
 * Пока продублирую этот код из базовой модели
 * В будущем может стоит разнести каким-то образом
 */
ns.ModelCollection.prototype.setData = function(data, options) {
    if (data) {
        this.data = this.preprocessData(data);

        // это составная модель —
        // нужно нужно разбить её на модели
        this._splitData(data);

        this.error = null;
        this.status = this.STATUS.OK;

        this.touch();

        //  Не проверяем здесь, действительно ли data отличается от oldData --
        //  setData должен вызываться только когда обновленная модель целиком перезапрошена.
        //  Можно считать, что она в этом случае всегда меняется.
        //  @chestozo: это может выйти боком, если мы, к примеру, по событию changed делаем ajax запрос
        if (!options || !options.silent) {
            this.trigger('changed', this.key);
        }
    }

};

ns.ModelCollection.prototype._reset = function() {
    ns.Model.prototype._reset.apply(this, arguments);
    this.models = [];
};

/**
 * Разбивает данные через jpath описанный в info.split
 * на составные модели
 */
ns.ModelCollection.prototype._splitData = function(data) {
    var info = this.info.split;

    var items = no.path(info.items, data);

    // удалим все старые модели
    this.clear();

    var models = this._splitModels(items);

    this.insert(models);
};

/**
 * Создает модели из разбитых данных
 *
 * @param { Array <JSON>} items – массив данных для будущих подмоделей
 * @return { Array <ns.Model> } – массив полученных подмоделей
 */
ns.ModelCollection.prototype._splitModels = function(items) {
    var info = this.info.split;

    var models = [];

    items.forEach(function(item) {

        var params = {};
        for (var key in info.params) {
            params[key] = no.path(info.params[key], item);
        }

        // идентификатор подмодели берется из info.model_id
        // он коллецкия может содержать модели только одного вида
        var model = ns.Model.create(info.model_id, params, item);

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

    var info = this.info.split;

    // добавим нашу коллекцию с список слушающих коллекций для подмодели
    model.eventListeners = model.eventListeners || {};
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
        }
    }
};

/**
 * Удаляет подписку коллекции на подмодель
 * Обязательно при удалении подмодели из коллекции
 *
 * @param {ns.Model} model
 */
ns.ModelCollection.prototype._unsubscribeSplit = function(model) {
    if (model.eventListeners) {
        delete model.eventListeners[this.key];
    }
};

/**
 * Удаляет все подмодели из коллекции
 * С каждой модели происходит снятие подписки
 */
ns.ModelCollection.prototype.clear = function() {

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
 * @param [{Number}] index – индекс позиции на которое вставить подмодели
 * @return {Boolean} – признак успешности вставки
 */
ns.ModelCollection.prototype.insert = function(models, index) {

    index = isNaN(index) ? this.models.length : index;

    // если переданная модель не массив
    if (!(models instanceof Array)) {
        // обернем ее в массив
        models = [models];
    }

    var info = this.info.split;

    models.forEach(function(model) {

        this.models.splice(index, 0, model);
        index++;

        // не забудем подписаться на события
        this._subscribeSplit(model);

    }.bind(this));

    // оповестим всех, что вставили модель
    // причем тригерить будем на каждой модельке
    // по-отдельности
    models.forEach(function(model) {
        this.trigger('insert', model);
    }.bind(this));

    return true;
};

/**
 * Удаляет подмодель из коллекции
 *
 * @param {ns.Model | Number} needle – подмодель или индекс подмодели, которую надо удалить
 * @return {Boolean} – признак успешности удаления
 */
ns.ModelCollection.prototype.remove = function(index) {

    if (isNaN(index)) {
        index = this.indexOf(index);
    }

    if (index >= 0) {
        var models = this.models;
        var model = this.models[index];

        // не забудем отписаться от событий подмодели
        this._unsubscribeSplit(model);
        this.models.splice(index, 1);

        this.trigger('remove', model);

        return true;
    }

    return false;
};


/**
 * Возвращает индекс подмодели из this.models
 *
 * @param {ns.Model} needle – подмодель
 */
ns.ModelCollection.prototype.indexOf = function(needle) {
    var models = this.models;

    for (var index = 0, length = models.length; index < length; index++) {
        var model = this.models[index];
        if (model === needle) {
            return index;
        }
    }

    return -1;
};

})();
