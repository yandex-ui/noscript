/**
 * Менеджер запросов ns.request.
 * @description Менеджер регулирует запросы, контроллирует отсутствие дубликатов и перезапросы.
 * @namespace
 */
ns.request.manager = {

    /**
     * @enum {number}
     */
    STATUS: {
        LOADING: 0,
        FAILED: 1,
        DONE: 2
    },

    _keys: {},

    /**
     * Добавляет запрос модели.
     * @param {ns.Model} model Модель.
     * @param {number} requestId ID запроса.
     * @param {Boolean} forced Флаг принудительного запроса.
     * @returns {Boolean|ns.Model} Если true - модель надо запросить, false - ничег не надо делать, ns.Model - дождаться ресолва промиса возвращенной модели.
     */
    add: function(model, requestId, forced) {
        var REQUEST_STATUS = this.STATUS;

        var modelKey = model.key;
        var request = this._keys[modelKey];

        // если уже кто-то запрашивает такой ключ
        if (request) {
            if (request.status === REQUEST_STATUS.LOADING) {
                if (model.isDo()) {
                    // если do-запрос с статусе loading, то request.model !== model, потому что do-модели не сохраняются
                    // поэтому тут надо вернуть модель из request, резолвить будем ее и ссылаться будем на нее
                    return request.model;

                } else {
                    if (forced) {
                        // Если запрос forced, но модель уже грузится
                        // retries увеличивать не надо
                        // новый promise создавать не надо, чтобы отрезолвить и первый запрос и этот
                        request.model.requestID = requestId;
                        return true;

                    } else {
                        return request.model;
                    }
                }

            } else if (request.status === REQUEST_STATUS.FAILED) {
                if (request.model.canRequest()) {
                    this._createRequest(model, requestId);
                    return true;

                } else {
                    model.status = model.STATUS.ERROR;
                    // убираем этот запрос, он больше не будет запрашиваться
                    this.done(model, true);
                    return false;
                }

            } else {
                // сюда приходят уже запрошенные модели, у которых request.status === DONE
                // может быть два варианта

                if (model.isValid()) {
                    // модель запросилась, данные положились, все хорошо
                    // говорим, что модель запрашивать не надо
                    return false;

                } else {
                    /*
                     Кто-то успел инвалидировать модель.
                     Такое возможно, если этот запрос ждал другого.

                     Например,
                     запрос1: m1, m2
                     запрос2: m1, m3

                     Запрос2 завершился раньше и ждет Запрос1.
                     В это время что-то случается, что приводит к инвалидации m3.
                     Тогда мы попадем в эту ветку и перезапросим модель.
                     */

                    if (model.canRequest()) {
                        // надо ее перезапросить
                        this._createRequest(model, requestId);
                        return true;

                    } else {
                        // модель не валидна, но запрашивать её нельзя - ничего не делаем
                        return false;
                    }
                }
            }

        } else {

            if (model.isValid()) {

                // модель валидна, но запрос форсирован и это не этот же запрос
                // проверка model.requestID !== requestId нужна, чтобы зарезолвить промис после окончания запроса
                // иначе forcedModel будет валида, но будет перезапрашиваться из-за forced === true
                if (forced && model.requestID !== requestId) {
                    this._createRequest(model, requestId);
                    return true;
                }

                // если модель валидна и запрос не форсирован - ничего не деалем
                return false;

            }

            // модель не валидна, но запрашивать её нельзя - ничего не делаем
            if (!model.canRequest()) {
                return false;
            }

            // модель не валидна и её можно запросить - надо запросить
            this._createRequest(model, requestId);
            return true;
        }
    },

    /**
     * Выставляет статус запроса модели в завимости от результата.
     * @param {ns.Model} model Модель
     * @param {Boolean} [force=false] Принудительно выставить DONE.
     */
    done: function(model, force) {
        var request = this._keys[model.key];
        // хотя такого не может быть, но вдруг его нет
        if (request) {
            if (model.isValid() || force) {
                request.status = this.STATUS.DONE;

            } else {
                request.status = this.STATUS.FAILED;
            }
        }
    },

    /**
     * Удаляет модель из запросов. Вызывается после завершения ns.request.model.
     * @param {ns.Model[]} models Массив запрашиваемых моделей.
     */
    clean: function(models) {
        for (var i = 0, j = models.length; i < j; i++) {
            var model = models[i];

            // обнуляем попытки после завершения запроса
            model.retries = 0;
            // удаляем модель из списка запрашиваемых
            delete this._keys[model.key];
        }
    },

    /**
     * Записывает информацию о запросе.
     * @param {ns.Model} model Запрашиваемая модель.
     * @param {number} requestId ID запроса.
     * @private
     */
    _createRequest: function(model, requestId) {
        // модель надо запросить
        this._keys[model.key] = {
            status: this.STATUS.LOADING,
            model: model
        };
        model.prepareRequest(requestId);
    }
};
