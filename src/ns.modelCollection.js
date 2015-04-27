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
     * Дефолтное значение jpath
     * по которому сплит будет искать коллекцию
     * @type {String}
     */
    ns.ModelCollection.prototype.DEFAULT_ITEMS_SPLIT = '.items';

    /**
     *
     * @private
     */
    ns.ModelCollection.prototype._init = function() {
        /**
         * Хэшик с событиями, навешанными на элементы коллекции.
         * @type {object}
         * @private
         */
        this._modelsEvents = {};

        ns.Model.prototype._init.apply(this, arguments);
    };

    /**
     *
     * @returns {{}|*}
     */
    ns.ModelCollection.prototype.getData = function() {
        // TODO а точно это нужно? Можно ведь просто всегда взять элементы из collection.models.

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
                jpathItems = this.DEFAULT_ITEMS_SPLIT;
            }

            // если нет поля data сделаем его
            if (!this.data) {
                this.data = {};
            }

            // если корень (this.data)
            if (jpathItems === '/') {
                // нельзя передать this.data в функцию и ждать, что он станет пустым массивом,
                // поэтому делаем это руками
                this.data = [];

            } else {
                // делаем нужное поле в .data и делаем его пустым
                no.jpath.set(jpathItems, this.data, []);
            }
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
     * @param {*} data Новые данные.
     * @param {ns.Model~setOptions} [options] Флаги.
     * @private
     */
    ns.ModelCollection.prototype._beforeSetData = function(data, options) {
        var splitInfo = this.info.split;

        if (splitInfo) {
            // по умолчанию будем искать коллекцию в поле items
            var items = no.jpath(splitInfo.items || this.DEFAULT_ITEMS_SPLIT, data);
            var models = this._splitModels(items, options);

            if (models && this.models && this.models.length) {

                var remove = [];
                var insert = [];
                var i = 0;
                var length = 0;

                // Ищем новые модели
                for (i = 0, length = models.length; i < length; i++) {
                    if (this.models.indexOf(models[i]) ===  -1) {
                        insert.push(models[i]);
                    }
                }

                // Ищем удаленные модели
                for (i = 0, length = this.models.length; i < length; i++) {
                    if (models.indexOf(this.models[i]) === -1) {
                        remove.push(this.models[i]);
                    }
                }

                this.__removeModels(remove);
                this.__insertModels(insert);

                this.models = models;

            } else {
                this.insert(models);
            }

        } else {
            this.clear();
        }

        // TODO может быть стоит удалять данные split-а?

        return data;
    };

    /**
     * Создает модели из разбитых данных
     *
     * @param { Array } items – массив данных для будущих подмоделей
     * @param {ns.Model~setOptions} [options] Флаги.
     * @returns { ns.Model[] } – массив полученных подмоделей
     * @private
     */
    ns.ModelCollection.prototype._splitModels = function(items, options) {
        var splitInfo = this.info.split;

        return items.map(function(item) {
            var params = {};
            for (var key in splitInfo.params) {
                params[key] = no.jpath(splitInfo.params[key], item);
            }

            // идентификатор подмодели берется из info.model_id
            var modelId;
            if (typeof splitInfo.model_id === 'function') {
                // если model_id - функция, то передаем туда данные и параметры,
                // а она должна вернуть id модели
                modelId = splitInfo.model_id(item, params);
            } else {
                modelId = splitInfo.model_id;
            }

            if (modelId) {
                return ns.Model.get(modelId, params).setData(item, options);
            }
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
     * Метод реакции на изменения элементов коллекции.
     * @description Основной смысл этого метода в том, чтобы его можно было переопределить
     * и триггерить изменение коллекции только для части изменений элементов коллекции.
     * @param {string} evt Событие 'ns-model-changed' от элемента коллекции
     * @param {ns.Model} model Измененный элемент коллекции.
     * @param {string} jpath JPath, по которому произошли изменения.
     * @fires ns.ModelCollection#ns-model-changed
     */
    ns.ModelCollection.prototype.onItemChanged = function(evt, model, jpath) {
        // TODO тут можно триггерить много чего, но мы пока этого не делаем:
        // this.trigger('ns-model-changed.items[3].some.inner.prop'); // (ЭТОГО СЕЙЧАС НЕТ).

        /**
         * Сообщает об изменении элементов коллекции.
         * @event ns.ModelCollection#ns-model-changed
         * @param {object} info Объект с информацией об изменениях.
         * @param {ns.Model} info.model Измененный элемент коллекции.
         * @param {string} info.jpath JPath, по которому произошли изменения.
         */
        this.trigger('ns-model-changed', { 'model': model, 'jpath': jpath });
    };

    /**
     * Метод вызывается, когда у элемента коллекции меняется версия.
     * @param {string} evt Событие 'ns-model-touched' от элемента коллекции
     * @param {ns.Model} model Измененный элемент коллекции.
     */
    ns.ModelCollection.prototype.onItemTouched = function(evt, model) {
        /* jshint unused: false */
        // У коллекции есть собственная версия (this._versionSelf) и версия элементов коллекции (this._version).
        // Когда меняется элемент коллекции - версия самой коллекции не меняется.
        this._version++;
    };

    /**
     * Метод вызывается, когда уничтожается элемент коллекции.
     * @param {string} evt Событие 'ns-model-destroyed' от элемента коллекции.
     * @param {ns.Model} model Уничтоженный элемент коллекции.
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
     * @borrows ns.Model.prototype._incVersion as ns.ModelCollection.prototype._incVersion
     */
    ns.ModelCollection.prototype._incVersion = function() {
        ns.Model.prototype._incVersion.apply(this, arguments);

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
     * @fires ns.ModelCollection#ns-model-remove
     */
    ns.ModelCollection.prototype.clear = function() {
        var models = this.models;

        // Это нужно и для начальной инициализации моделей.
        // Сначала удаляем все элементы, потом отписываем и бросаем событие

        /**
         * Массив с моделями - элементами коллекции.
         * @type {ns.Model[]}
         */
        this.models = [];

        if (models && models.length) {
            var that = this;
            models.forEach(function(model) {
                that._unsubscribeSplit(model);
            });

            // бросаем событие об удалении всех элементов
            this.trigger('ns-model-remove', models);
        }
    };

    /**
     * Вставляет подмодели в коллекцию
     *
     * @param {ns.Model[] | ns.Model} models – одна или несколько подмоделей для вставки
     * @param {number} [index] – индекс позиции, на которую вставить подмодели. Если не передано - вставка в конец.
     *
     * @returns {Boolean} – признак успешности вставки
     * @fires ns.ModelCollection#ns-model-insert
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
            // В массиве может быть пустое место, если model_id - функция,
            // которая может выкидывать элементы из коллекции.
            // Поэтому надо писать if (model && ...)

            model = models[i];
            // Добавим только те модели, которых ещё нет ни в коллекции, ни в списке добавляемых
            if (model && this.models.indexOf(model) < 0 && insertion.indexOf(model) < 0) {
                insertion.push(model);
            }
        }

        return this.__insertModels(insertion, index);
    };

    /**
     * Вставляет модели в коллекцию
     *
     * @param {ns.Model[]} models – массив моделей
     * @param {Number} index – индекс позиции, на которую вставить подмодели.
     * @private
     */
    ns.ModelCollection.prototype.__insertModels = function(models, index) {
        for (var i = 0, length = models.length; i < length; i++) {
            this.models.splice(index + i, 0, models[i]);
            this._subscribeSplit(models[i]);
        }

        // оповестим всех, что вставили подмодели
        if (models.length > 0) {
            // если вставка данных состоялась, считаем модель валидной
            this.status = this.STATUS.OK;

            /**
             * Сообщает о вставке новых элементов коллекции.
             * @event ns.ModelCollection#ns-model-insert
             * @param {array} insertion Массов вставленных элементов.
             */
            this.trigger('ns-model-insert', models);

            return true;
        }

        return false;
    };

    /**
     * Удаляет элементы коллекции.
     *
     * @param {ns.Model | Number | ns.Model[] | Number[]} models – подмодели или индексы подмодели, которую надо удалить
     * @returns {Boolean} – признак успешности удаления.
     * @fires ns.ModelCollection#ns-model-remove
     */
    ns.ModelCollection.prototype.remove = function(models) {
        if (!Array.isArray(models)) {
            models = [ models ];
        }

        // преобразуем индексы в экземпляры,
        // потому с индексами работать небезопасно из-за их смещения после удаления
        var itemsToRemove = this._modelsIndexToInstance(models);
        var removedItems = [];

        // пробегаем по элементам, которые надо удалить, и ищем их в коллекции
        for (var i = 0, j = itemsToRemove.length; i < j; i++) {
            var itemToRemove = itemsToRemove[i];
            var itemToRemoveIndex = this.models.indexOf(itemToRemove);

            // если модель есть в списке на удаление
            if (itemToRemoveIndex > -1) {
                itemToRemove._itemToRemoveIndex = itemToRemoveIndex;
                removedItems.push(itemToRemove);
            }
        }

        return this.__removeModels(removedItems);
    };

    /**
     * Удаляет модели из коллекции
     *
     * @param {ns.Model[]} models – список моделей
     * @private
     */
    ns.ModelCollection.prototype.__removeModels = function(models) {

        // Надо отсортировать модели по убыванию индекса в this.models и удалять их с конца
        models = models.sort(function(a, b) {return b._itemToRemoveIndex - a._itemToRemoveIndex;});

        for (var i = 0, length = models.length; i < length; i++) {
            // отписываем ее
            this._unsubscribeSplit(models[i]);
            this.models.splice(models[i]._itemToRemoveIndex, 1);
        }

        if (models.length) {
            /**
             * Сообщает об удалении элементов коллекции.
             * @event ns.ModelCollection#ns-model-remove
             * @param {array} modelsRemoved Массив удаленных моделей.
             */
            this.trigger('ns-model-remove', models);
            return true;
        }

        return false;
    };

    /**
     * Преобразует индексы моделей в их экземпляры.
     * @param {ns.Model[]|Number[]} models Элементы коллекции или их индексы.
     * @returns {ns.Model[]}
     * @private
     */
    ns.ModelCollection.prototype._modelsIndexToInstance = function(models) {
        var items = [];

        for (var i = 0, j = models.length; i < j; i++) {
            var index = models[i];
            if (typeof index === 'number') {
                var item = this.models[index];
                if (this.models[index]) {
                    items.push(item);
                }
            } else {
                items.push(index);
            }
        }

        return items;
    };

})();
