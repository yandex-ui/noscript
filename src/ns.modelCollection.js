(function() {

    /**
     * Создает модель-коллекцию.
     * @classdesc Модель-коллекция.
     * @tutorial ns.modelCollection
     * @constructor
     * @augments ns.Model
     */
    ns.ModelCollection = function() {};

    no.inherit(ns.ModelCollection, ns.Model);

    /**
     *
     * @private
     */
    ns.ModelCollection.prototype._init = function() {
        ns.Model.prototype._init.apply(this, arguments);

        // Хэшик с событиями, навешанными на элементы коллекции.
        this._modelsEvents = {};
    };

    /**
     *
     * @returns {{}|*}
     */
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

    /**
     *
     * @private
     */
    ns.ModelCollection.prototype._reset = function() {
        ns.Model.prototype._reset.apply(this, arguments);

        this.clear();
    };

    /**
     * Разбивает данные через jpath описанный в info.split
     * на составные модели
     * @private
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
     * @param { Array } items – массив данных для будущих подмоделей
     * @returns { ns.Model[] } – массив полученных подмоделей
     * @private
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
     * @private
     */
    ns.ModelCollection.prototype._subscribeSplit = function(model) {
        var that = this;

        this.bindModel(model, 'ns-model-changed', function(evt, jpath) {
            that.onItemChanged(evt, model, jpath);
        });

        this.bindModel(model, 'ns-model-touched', function(evt) {
            that.onItemTouched(evt, model);
        });

        this.bindModel(model, 'ns-model-destroyed', function(evt) {
            that.onItemDestroyed(evt, model);
        });
    };

    /**
     * Подписывает callback на событие eventName модели model
     *
     * @param {ns.Model} model
     * @param {string} eventName
     * @param {function} callback
     */
    ns.ModelCollection.prototype.bindModel = function(model, eventName, callback) {
        var events = (this._modelsEvents[model.key] || (this._modelsEvents[model.key] = {}));

        model.on(eventName, callback);
        events[eventName] = callback;
    };

    ns.ModelCollection.prototype.unbindModel = function(model, eventName) {
        var events = this._modelsEvents[model.key];
        if (!events || !events[eventName]) {
            return;
        }

        model.off(eventName, events[eventName]);
        delete events[eventName];
    };

    /**
     *
     * @param {string} evt
     * @param {ns.Model} model
     * @param {string} jpath
     */
    ns.ModelCollection.prototype.onItemChanged = function(evt, model, jpath) {
        // Основной смысл этого метода в том, чтобы его можно было переопределить
        // и триггерить изменение коллекции только для части изменений элементов коллекции.

        // TODO тут можно триггерить много чего, но мы пока этого не делаем:
        // this.trigger('ns-model-changed.items[3].some.inner.prop'); // (ЭТОГО СЕЙЧАС НЕТ).

        this.trigger('ns-model-changed', { 'model': model, 'jpath': jpath });
    };

    /**
     * Метод вызывается, когда у элемента коллекции меняется версия.
     * @param {string} evt Название события. "ns-model-touched"
     * @param {ns.Model} model Экземпляр модели, которая изменилась
     */
    ns.ModelCollection.prototype.onItemTouched = function(evt, model) {
        /* jshint unused: false */
        // У коллекции есть собственная версия (this._versionSelf) и версия элементов коллекции (this._version).
        // Когда меняется элемент коллекции - версия самой коллекции не меняется.
        this._version++;
    };

    /**
     * Метод вызывается, когда уничтожается элемент коллекции.
     * @param {string} evt Название события. "ns-model-destroyed"
     * @param {ns.Model} model Экземпляр уничтоженной модели
     */
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
     * @private
     */
    ns.ModelCollection.prototype._unsubscribeSplit = function(model) {
        if (model.key in this._modelsEvents) {
            var events = this._modelsEvents[model.key];

            for (var eventName in events) {
                model.off(eventName, events[eventName]);
            }

            delete this._modelsEvents[model.key];
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
        }

        // Это нужно и для начальной инициализации моделей.
        this.models = [];
    };

    /**
     * Вставляет подмодели в коллекцию
     *
     * @param {ns.Model[] | ns.Model} models – одна или несколько подмоделей для вставки
     * @param {number} [index] – индекс позиции, на которую вставить подмодели. Если не передано - вставка в конец.
     *
     * @returns {Boolean} – признак успешности вставки
     */
    ns.ModelCollection.prototype.insert = function(models, index) {
        // переинициализация после #destroy()
        this._reinit();

        if (isNaN(index)) {
            index = this.models.length;
        }

        if (!Array.isArray(models)) {
            models = [ models ];
        }

        var insertion = [];
        var model;
        for (var i = 0; i < models.length; i++) {
            model = models[i];
            // Добавим только те модели, которых ещё нет ни в коллекции, ни в списке добавляемых
            if (this.models.indexOf(model) < 0 && insertion.indexOf(model) < 0) {
                insertion.push(model);
            }
        }

        insertion.forEach(function(model, i) {
            this.models.splice(index + i, 0, model);
            this._subscribeSplit(model);
        }, this);

        // оповестим всех, что вставили подмодели
        if (insertion.length > 0) {
            // если вставка данных состоялась, считаем модель валидной
            this.status = this.STATUS.OK;

            this.trigger('ns-model-insert', insertion);

            return true;
        }

        return false;
    };

    /**
     * Удаляет элементы коллекции.
     *
     * @param {ns.Model | Number | ns.Model[] | Number[]} models – подмодели или индексы подмодели, которую надо удалить
     * @returns {Boolean} – признак успешности удаления.
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
