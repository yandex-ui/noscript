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

    // отдельно созраняем коллбек на событие `changed`
    // здесь надо подумать над событиями `changed.something`
    if (!this._callbackChange) {
        this._callbackChange = this.trigger.bind(this);
    }

    var callbackChange = this._callbackChange;

    model.on('changed', callbackChange);

    var info = this.info.split;

    // пока придется брать события из this.info.split.events
    // если брать события из this.info.events, придется
    // подписывать подмодель на те события, которые в ней никогда
    // не стригерятся
    // надо переделать
    if (info.events) {
        for (var eventName in info.events) {
            (function() {

                // получим нужный коллбек из объекта коллекции
                var method = this._prepareCallback(info.events[eventName]);

                // будем запоминать все навешанные коллбеки, для анбиндига
                this._callbacksEvents = this._callbacksEvents || {};

                var callback = this._callbacksEvents[eventName];

                if (!callback) {
                    // если нет нужного коллбека опишем его таким образом:
                    callback = this._callbacksEvents[eventName] = function(data) {
                        // необходимо пробросить подмодель, на котором произошло событие
                        method.call(this, model, data);
                    }.bind(this);
                }
                model.on(eventName, callback);

            }.bind(this))();
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
 * @param [{Number}] index – индекс позиции, куда надо вставить подмодели
 */
ns.ModelCollection.prototype.insert = function(models, index) {

    index = !isNaN(index) ? index : this.models.length;
    var info = this.info.split;

    if (!(models instanceof Array)) {
        models = [models];
    }

    models.forEach(function(model) {
        // если переданная модель является моделью и принадлежит коллекции
        // то можно смело ее вставлять
        if (this.isMyModel(model)) {
            this.models.splice(index, 0, model);
            index++;

            // не забудем подписаться на события
            this._subscribeSplit(model);
        }
    }.bind(this));
};

/**
 * Находит и удаляет подмодель из коллекции
 * Может в будущем разнести на два метода indexOf(model) и remove(index)?
 *
 * @param {ns.Model} needle – модель, которую надо удалить
 * @return {Boolean} – признак успешности удаления
 */
ns.ModelCollection.prototype.remove = function(needle) {
    // ищем только интересные для нас модели
    if (!this.isMyModel(needle)) {
        // возвращаем признак того, что модель удалить не получилось
        return false;
    }

    var models = this.models;

    for (var index = 0, length = models.length; index < length; index++) {
        var model = this.models[index];
        if (model === needle) {

            // не забудем отписаться от событий подмодели
            this._unsubscribeSplit(model);
            this.models.splice(index, 1);

            return true;
        }
    }

    return false;
};

/**
 * Ищет метод в объекте по имени или возвращает переданную функцию
 * Нужен для навешивания коллбеков
 *
 * @param {String | Function} method
 * @return {Function}
 */
ns.ModelCollection.prototype._prepareCallback = function(method) {
    if (typeof method === 'string') {
        method = this[method];
    }

    if (typeof method !== 'function') {
        throw new Error("[ns.View] Can't find method '" + method + "' in '" + this.id + "'");
    }

    return method;
};

/**
 * Возвращает признак того, что подмодель принадлежит коллекции
 *
 * @param {ns.Model} model
 * @return {Boolean}
 */
ns.ModelCollection.prototype.isMyModel = function(model) {
    return model instanceof ns.Model && this.info.split.model_id === model.id
};

})();
