var no = no || require('nommon');
var ns = ns || require('./ns.js');

(function() {

    /**
     * Делает запрос моделей с сервера.
     * Аргументы можно передавать в 3 форматах:
     *   - string item, params - одна модель и опциональные параметры для нее
     *   - array item[], params - массив моделей и опциональные единые для всех параметры
     *   - array item[] - массив моделей вида {id: modelName, params: modelParams}
     * @param {String|Array|Object} items Массив названий моделей.
     * @param {object} [params] Параметры моделей.
     * @param {object} [options] Опции запроса.
     * @param {Boolean} [options.forced=false] Не учитывать закешированность моделей при запросе.
     * @returns {Vow.Promise}
     * @namespace
     */
    ns.request = function(items, params, options) {
        return ns.request.models(items2models(items, params), options);
    };

    /**
     * Делает запрос моделей с сервера, не учитывая их закешированности.
     * @see ns.request
     * @param {String|Array|Object} items Массив названий моделей.
     * @param {object} [params] Параметры моделей.
     * @param {object} [options] Опции запроса.
     * @param {Boolean} [options.forced=false] Не учитывать закешированность моделей при запросе.
     * @returns {Vow.Promise}
     */
    ns.forcedRequest = function(items, params, options) {
        options = options || {};
        options.forced = true;
        return ns.request.models(items2models(items, params), options);
    };

    /**
     * Делает запрос моделей с сервера.
     * @param {ns.Model[]} models Массив моделей.
     * @param {object} [options] Опции запроса.
     * @param {Boolean} [options.forced=false] Не учитывать закешированность моделей при запросе.
     * @returns {Vow.Promise}
     */
    ns.request.models = function(models, options) {

        // Загрузка порционных данных. В этом случае грузим не саму модель, а порцию данных.
        models = models.map(function(model) {
            return model.getRequest ? model.getRequest() : model;
        });

        var request = new Request(models, options);

        return request.start();
    };

    /**
     * Дополнительные общие параметры запроса.
     * Эти параметры добавляются в любой запрос.
     * @public
     * @type {object}
     */
    ns.request.requestParams = {};

    /**
     * Добавляет к params, параметры из ns.request.requestParams.
     * @param {object} params Параметры запроса.
     */
    ns.request.addRequestParams = function(params) {
        no.extend(params, ns.request.requestParams);
    };

    /**
     * Урл до сервера.
     * @type {string}
     */
    ns.request.URL = '/models/';

    /**
     * Метод для проверки ответа данных.
     * Может использоваться, например, при проверки авторизации.
     * @returns {boolean}
     */
    ns.request.canProcessResponse = function() {
        return true;
    };

    /**
     * Устанавливает начальное состояние
     * @private
     */
    ns.request._reset = function() {
        this.Manager._keys = {};
    };

    ns.request.Manager = {

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
                    if (request.model.canRetry()) {
                        this._createRequest(model, requestId);
                        return true;

                    } else {
                        model.status = model.STATUS.ERROR;
                        model.retries = 0;
                        // убираем этот запрос, он больше не будет запрашиваться
                        this.done(model, true);
                        return false;
                    }

                } else {

                    // FIXME chestozo: тут бывает так, что модель в статусе ошибка, а мы ей затираем статус и делаем её ок.
                    // model.status = model.STATUS.OK;
                    model.retries = 0;
                    return false;
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

                } else {
                    // модель не валидна или запрос форсирован - надо запросить
                    this._createRequest(model, requestId);
                    return true;
                }
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
                delete this._keys[models[i].key];
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

    var REQUEST_ID = 0;

    var Request = function(models, options) {
        /**
         * ID запроса.
         * @type {number}
         * @private
         */
        this.id = REQUEST_ID++;

        /**
         * Массив запрашиваемых моделей
         * @type {ns.Model[]}
         * @private
         */
        this.models = models;

        /**
         * Опции запроса.
         * @type {object}
         * @private
         */
        this.options = options || {};

        this.promise = new Vow.Promise();
    };

    // ------------------------------------------------------------------------------------------------------------- //

    Request.prototype.start = function() {
        var loading = [];
        var requesting = [];

        var models = this.models;
        for (var i = 0, l = models.length; i < l; i++) {
            var model = models[i];

            var addRequest = ns.request.Manager.add(model, this.id, this.options.forced);
            if (addRequest === true) {
                requesting.push(model);

            } else if (addRequest instanceof ns.Model) {
                loading.push(model);
            }
        }

        this.request(loading, requesting);

        return this.promise;
    };

    Request.prototype.request = function(loading, requesting) {
        var all = [];
        // promise от http-запроса
        var httpRequest;

        if (requesting.length) {
            //  Запрашиваем модели, которые нужно запросить.
            var params = models2params(requesting);
            var modelsNames = requesting.map(models2name);
            ns.request.addRequestParams(params);
            // отдельный http-promise нужен для того, чтобы реквест с этой моделью, запрашиваемой в другом запросе,
            // мог зарезолвится без завершения http-запроса
            httpRequest = ns.http(ns.request.URL + '?_m=' + modelsNames.join(','), params, {type: 'POST'});

            all = all.concat( requesting.map(model2Promise) );

        }/* else {
            //TODO: надо перепроверить поведение, если нет запросов
            // создаем фейковый зарезолвленный promise
            httpRequest = new no.Promise().resolve();
        }
        */

        if (loading.length) {
            //  Ждем все остальные модели, которые должны загрузиться (уже были запрошены).
            all = all.concat( loading.map(model2Promise) );
        }

        //  Мы ждём какие-то данные:
        //    * либо мы запросили какие-то новые модели;
        //    * либо мы ждем ранее запрошенные модели.
        if (all.length) {
            var that = this;

            if (httpRequest) {
                //TODO: что будет если fail?
                httpRequest.then(function(r) {
                    /*
                    if (ns.request.canProcessResponse(r) === false) {
                        //TODO: clear keys, promise.reject()

                    } else {
                    */
                    if (ns.request.canProcessResponse(r) !== false) {
                        //  В r должен быть массив из одного или двух элементов.
                        if (requesting.length) {
                            that.extract(requesting, r);
                        }/* else {
                            //TODO: clear keys, promise.reject()
                        }
                        */
                    }
                });
            }

            // Ждем резолва всех моделей и "повторяем" запрос
            // Если какие-то ключи не пришли, они будут перезапрошены.
            Vow.all(all).then(this.start.bind(this));

        } else {
            // у всех моделей есть какой-то статус (ERROR или OK)
            // вызываем чистку менеджера
            ns.request.Manager.clean(this.models);

            // и резолвим весь ns.request
            this.promise.fulfill(this.models);
        }
    };

    Request.prototype.extract = function(models, response) {
        // response - это объект, чтобы дать возможность напихать туда сервисных данных
        // ответы хендлеров приходят в массиве response.models
        var results = (response && response.models) || [];
        for (var i = 0, l = models.length; i < l; i++) {
            var model = models[i];
            var result = results[i];

            // если модель запрашиваем кто-то другой, то этот ответ игнорируем
            if (model.requestID > this.id) {
                continue;
            }

            var data;
            var error;
            if (!result) {
                error = {
                    id: 'NO_DATA',
                    reason: 'Server returned no data'
                };
            } else {
                data = model.extractData(result);
                if (!data) {
                    error = model.extractError(result);
                    if (!error) {
                        error = {
                            id: 'INVALID_FORMAT',
                            reason: 'response should contain result or error'
                        };
                    }
                }
            }

            if (data) {
                model.setData(data);
            } else {
                model.setError(error);
            }

            // сообщаем менеджеру о завершении запроса этой модели
            // это не означает, что завершится весь ns.request
            ns.request.Manager.done(model);

            model.promise.fulfill();
        }
    };

    function models2params(models) {
        var params = {};

        for (var i = 0, l = models.length; i < l; i++) {
            var suffix = '.' + i; // Чтобы не путать параметры с одинаковыми именами разных моделей,
                                  // добавляем к именам параметров специальный суффикс.
            var model = models[i];

            //  Добавляем служебный параметр, содержащий id модели, которую мы хотим запросить.
            params[ '_model' + suffix ] = model.id;

            //  Каждая модель прокидывает в params все свои параметры.
            //  При этом к имени параметра добавляется суффикс.
            var mParams = model.getRequestParams();
            for (var name in mParams) {
                params[name + suffix] = mParams[name];
            }

        }

        return params;
    }

    /**
     * Приводит запрашиваемые модели к формату №3 из ns.request.
     * @param {Array} items Массив названией моделей.
     * @param {object} params Параметры моделей.
     * @returns {Array}
     */
    function normalizeItems(items, params) {
        var _items = [];
        for (var i = 0, l = items.length; i < l; i++) {
            _items.push({
                id: items[i],
                params: params
            });
        }

        return _items;
    }

    /**
     * Возвращает promise из model
     * @param {ns.Model} model Модель
     * @returns {Vow.Promise}
     */
    function model2Promise(model) {
        return model.promise;
    }

    /**
     * Приводит аргументы из ns.request к моделям.
     * @param {String|Array|Object} items Массив названий моделей.
     * @param {object} [params] Параметры моделей.
     * @returns {ns.Model[]}
     */
    function items2models(items, params) {
        // приводим к формату №2
        if (typeof items === 'string') {
            items = [ items ];
        }

        // приводим №2 к формату №3
        if (typeof items[0] === 'string') {
            params = params || {};
            items = normalizeItems(items, params);
        }

        var models = [];
        for (var i = 0, l = items.length; i < l; i++) {
            var item = items[i];
            if (item.model && item.model instanceof ns.Model) {
                models.push(item.model);
            } else {
                models.push(ns.Model.get(item.id, item.params));
            }
        }

        return models;
    }

    function models2name(model) {
        return model.id;
    }

})();
