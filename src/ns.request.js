(function() {

    /**
     * Делает запрос моделей с сервера.
     * Аргументы можно передавать в следующих форматах:
     *   - string item, params - одна модель и опциональные параметры для нее
     *     ns.request('model', params)
     *   - string[], params - массив моделей и опциональные единые для всех параметры
     *     ns.request(['model1', 'model2'], params)
     *   - object[] - массив моделей вида {id: modelName, params: modelParams}
     *     ns.request([
     *       {id: 'model1', params: params1},
     *       {id: 'model2', params: params2},
     *     ])
     *   - ns.Model[] - массив экземпляров моделей
     *     ns.request([ modelInstance1, modelInstance2 ]);
     * @param {String|Array} items Массив названий моделей.
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
     * @param {String|Array} items Массив названий моделей.
     * @param {object} [params] Параметры моделей.
     * @param {object} [options] Опции запроса.
     * @param {Boolean} [options.forced=false] Не учитывать закешированность моделей при запросе.
     * @returns {Vow.Promise}
     * @memberOf ns.request
     * @name forcedRequest
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
     * Запрашивает модели с сервера.
     * @param {object[]} models Список моделей с параметрами.
     * @returns {Vow.Promise}
     */
    ns.request.fetchModels = function(models) {
        var modelsNames = models.map(models2name);
        var url = ns.request.URL + '?_m=' + modelsNames.join(',');
        var params = models2params(models);
        var options = {};

        ns.request.addRequestParams(params);

        if (ns.request.FORMAT === 'json') {
            params = JSON.stringify(params);
            options.contentType = 'application/json; encoding=utf-8';
        }

        return ns.http(url, params, options);
    };

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
        ns.request.manager._keys = {};
    };

    /**
     * Обрабатывает ответ модели от сервера.
     * @param {ns.Model} model
     * @param {*} result
     */
    ns.request.extractModel = function(model, result) {
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

            var addRequest = ns.request.manager.add(model, this.id, this.options.forced);
            if (addRequest === true) {
                requesting.push(model);

            } else if (addRequest instanceof ns.Model) {
                loading.push(model);
            }
        }

        this.request(loading, requesting);

        return this.promise;
    };

    /**
     * Делаем запрос за моделями.
     * @param {ns.Model[]} loading Список моделей, которые уже грузятся.
     * @param {ns.Model[]} requesting Список моделей, которые надо запросить.
     */
    Request.prototype.request = function(loading, requesting) {
        var all = [];
        // promise от http-запроса
        var httpRequest;

        if (requesting.length) {

            var regularRequests = [];
            var customRequests = [];

            requesting.forEach(function(model) {
                // если у модели есть метод request, это значит, что она запросит себя сама
                if (typeof model.request === 'function') {

                    // Вызываем #request, он должен вернуть Vow.Promise.
                    // После завершения говорим об этом менеджеру, чтобы убрать запрос из очереди.
                    var modelRequestPromise = model.request().then(function() {
                        ns.request.manager.done(model);
                    }, function() {
                        ns.request.manager.done(model);
                    });

                    // это промис надо прописать модели,
                    // чтобы повторные запросы тоже отрезолвились
                    // @see ns.Model#prepareRequest
                    model.promise = modelRequestPromise;

                    // добавляем ко всем промисам, чтобы дождаться
                    customRequests.push(modelRequestPromise);
                } else {
                    regularRequests.push(model);
                }
            });

            all = all.concat(customRequests);

            if (regularRequests.length) {
                // отдельный http-promise нужен для того, чтобы реквест с этой моделью, запрашиваемой в другом запросе,
                // мог зарезолвится без завершения http-запроса
                httpRequest = ns.request.fetchModels(regularRequests);

                all = all.concat(regularRequests.map(model2Promise));
            }

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
                httpRequest.then(function(r) {
                    if (ns.request.canProcessResponse(r) === false) {
                        // если ответ обработать нельзя, то удаляем модели из запроса и отклоняем промис
                        ns.request.manager.clean(that.models);
                        that.promise.reject({
                            error: 'CANT_PROCESS',
                            invalid: that.models,
                            valid: []
                        });

                    } else {
                        that.extract(regularRequests, r);
                    }

                }, function(error) {
                    ns.log.error('ns.request.http', error);

                    // уходим в извлечение, чтобы пометить запрос завершенным
                    that.extract(regularRequests, {});
                });
            }

            // Ждем резолва всех моделей и "повторяем" запрос
            // Если какие-то ключи не пришли, они будут перезапрошены.
            Vow.all(all).then(this.start.bind(this));

        } else {
            // у всех моделей есть какой-то статус (ERROR или OK)
            // вызываем чистку менеджера
            ns.request.manager.clean(this.models);

            // сортируем модели на валидные и нет
            var validModels = [];
            var invalidModels = [];

            for (var i = 0, j = this.models.length; i < j; i++) {
                var model = this.models[i];
                if (model.isValid()) {
                    validModels.push(model);
                } else {
                    invalidModels.push(model);
                }
            }

            // если есть невалидные модели
            if (invalidModels.length) {
                this.promise.reject({
                    invalid: invalidModels,
                    valid: validModels
                });

            } else {
                // и резолвим весь ns.request
                this.promise.fulfill(this.models);
            }
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

            ns.request.extractModel(model, result);

            // сообщаем менеджеру о завершении запроса этой модели
            // это не означает, что завершится весь ns.request
            ns.request.manager.done(model);

            model.finishRequest();
        }
    };

    function models2params(models) {
        if (ns.request.FORMAT === 'json') {
            return {
                models: models.map(function(model) {
                    var params = model.getRequestParams();
                    return {
                        name: models2name(model),
                        // для обратной совместимости приводим параметры к строке, если не задан isStrictParams
                        params: model.info.isStrictParams ? params : ns.parseQuery($.param(params))
                    };
                })
            };
        }

        var params = {};

        for (var i = 0, l = models.length; i < l; i++) {
            var suffix = '.' + i; // Чтобы не путать параметры с одинаковыми именами разных моделей,
                                  // добавляем к именам параметров специальный суффикс.
            var model = models[i];

            //  Добавляем служебный параметр, содержащий id модели, которую мы хотим запросить.
            params[ '_model' + suffix ] = models2name(model);

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
            // ns.request( [ ModelInstance ] )
            if (item instanceof ns.Model) {
                models.push(item);

            } else if (item.model && item.model instanceof ns.Model) {
                models.push(item.model);

            } else {
                models.push(ns.Model.get(item.id, item.params));
            }
        }

        return models;
    }

    function models2name(model) {
        return model.info.serverId || model.id;
    }

})();
