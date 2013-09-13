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
    // из моделей её составляющих
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

        // пишем новые (тут тоже могут быть разреженные данные)
        this.models.forEach(function(model, index) {
            items[index] = model.getData();
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

        // идентификатор подмодели берётся из info.model_id
        // коллекция может содержать модели только одного вида
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
 * Подписывает коллекию на события подмодели
 *
 * @param {ns.Model} model
 */
ns.ModelCollection.prototype._subscribeSplit = function(model) {

    // добавим нашу коллекцию в список слушающих коллекций для подмодели
    model.eventListeners[this.key] = this;

    // если ранее мы не переопределяли прототипный тригер
    // то переопеделим его
    // XXX это очень жёсткий bad practice... Лучше модэли элементы коллекции тогда наследовать от какого-то ns.Model.CollectionItem, где всё это прописать.
    if (ns.Model.prototype.trigger === model.trigger) {
        model.trigger = function(evt, data) {
            // FIXME лучше apply(this, arguments)
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
 * Вставляет подмодели в коллекцию начиная с определённого индекса.
 * Коллекция при этом раздвигается.
 * Если индекс не передан — вставляет элементы в конец коллекции.
 *
 * @param { Array<ns.Model> | ns.Model } models - одна или несколько подмоделей для вставки
 * @param { Number= } index - индекс позиции, на которую вставить подмодели
 *
 * @return {Boolean} признак успешности вставки
 */
ns.ModelCollection.prototype.insert = function(models, index) {
    var that = this;

    if (typeof index === 'undefined') {
        index = this.models.length;
    }

    // Для удобства, одиночная модель оборачивается в массив.
    if ( !Array.isArray(models) ) {
        models = [models];
    }

    // Вставить можно только объявленную модель
    // и повторная вставка модели запрещена
    // FIXME может быть модель, которая уже в коллекции, надо вынуть из текущего места и вставить в новое?
    var inserted = models.filter(function(m) {
        return that.models.indexOf(m) < 0 && ns.Model.infoLite(m.id);
    });

    // splice() не умеет вставлять элементы с индексом больше текущей длины массива.
    // Поэтому вначале надо расширить массив.
    if (index > this.models.length) {
        this.models.length = index;
    }

    // А вот теперь уже можно вставлять новые модели.
    // Такой хитрый вызов через прототип массива, потому что у splice дурацкая сигнатура!
    Array.prototype.splice.apply(this.models, [index, 0].concat(inserted));

    // Помечаем новые элементы как зависящие от текущей коллекции.
    inserted.forEach(function(m) {
        that._subscribeSplit(m);
    });

    // оповестим всех, что вставили подмодели
    if (inserted.length) {
        // если данных не было, при insert говорим что данные появились
        if (this.status == this.STATUS.NONE) {
            this.status = this.STATUS.OK;
        }

        this.trigger('ns-model-insert', inserted);
    }

    return !!inserted.length;
};

/**
 * Перезаписывает модели в коллекции.
 * В отличие от insert() этот метод перезатрёт существующие модели.
 * @param { Array<ns.Model> | ns.Model } models - одна или несколько подмоделей для вставки
 * @param { Number= } index - индекс позиции, на которую вставить подмодели
 *
 * @return {Boolean} признак успешности вставки
*/
ns.ModelCollection.prototype.setItems = function(models, index) {
    if (typeof index === 'undefined') {
        index = this.models.length;
    }

    // Для удобства, одиночная модель оборачивается в массив.
    if ( !Array.isArray(models) ) {
        models = [models];
    }

    var model;
    var inserted = [];
    for (var i = 0; i < models.length; i++) {
        model = models[i];

        // Вставить можно только объявленную модель
        // и повторная вставка модели запрещена
        // FIXME может быть надо делать replace
        // FIXME теперь тут уже по факту replace
        if ( this.models.indexOf(model) >= 0 || !ns.Model.infoLite(model.id) ) {
            continue;
        }

        this.models[index + i] = model;
        this._subscribeSplit(model);
        inserted.push(model);
    }

    // оповестим всех, что вставили подмодели
    if (inserted.length) {
        // если данных не было, при insert говорим что данные появились
        if (this.status == this.STATUS.NONE) {
            this.status = this.STATUS.OK;
        }

        this.trigger('ns-model-insert', inserted);
    }

    return !!inserted.length;
};

/**
 * Удаляет подмодели из коллекции
 *
 * @param {ns.Model | Number | Array<ns.Model | Number>} models – подмодели или индексы подмодели, которую надо удалить
 * @return {Boolean} – признак успешности удаления
 */
ns.ModelCollection.prototype.remove = function(models) {
    var that = this;
    var modelsRemoved = [];

    if ( !Array.isArray(models) ) {
        models = [models];
    }

    models.forEach(function(modelOrIndex) {
        var index;

        if (typeof modelOrIndex === 'number') {
            index = modelOrIndex;
        } else {
            index = that.models.indexOf(modelOrIndex);
        }

        if (index >= 0) {
            var model = that.models[index];

            // Модели может и не быть (в разреженной коллекции).
            if (!model) {
                return;
            }

            // не забудем отписаться от событий подмодели
            that._unsubscribeSplit(model);
            modelsRemoved.push(model);
            that.models.splice(index, 1);
        }
    });

    if (modelsRemoved.length) {
        this.trigger('ns-model-remove', modelsRemoved);
    }

    return !!modelsRemoved.length;
};

})();
