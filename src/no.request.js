(function() {

//  ---------------------------------------------------------------------------------------------------------------  //
//  no.request
//  ---------------------------------------------------------------------------------------------------------------  //

/**
 * Делает запрос моделей с сервера.
 * Аргументы можно передавать в 3 форматах:
 *   - string item, params - одна модель и опциональные параметры для нее
 *   - array item[], params - массив моделей и опциональные единые для всех параметры
 *   - array item[] - массив моделей вида {id: modelName, params: modelParams}
 * @param {String|Array|Object} items Массив названий моделей.
 * @param {Object} [params] Параметры моделей.
 * @param {Object} [options] Опции запроса.
 * @param {Boolean} [options.forced=false] Не учитывать закешированность моделей при запросе.
 * @return {no.Promise}
 */
no.request = function(items, params, options) {
    return no.request.models(items2models(items, params), options);
};

/**
 * Делает запрос моделей с сервера, не учитывая их закешированности.
 * @see no.request
 * @param {String|Array|Object} items Массив названий моделей.
 * @param {Object} [params] Параметры моделей.
 * @param {Object} [options] Опции запроса.
 * @param {Boolean} [options.forced=false] Не учитывать закешированность моделей при запросе.
 * @return {no.Promise}
 */
no.forcedRequest = function(items, params, options) {
    options = options || {};
    options.forced = true;
    return no.request.models(items2models(items, params), options);
};

/**
 * Делает запрос моделей с сервера.
 * @param {no.Model[]} models Массив моделей.
 * @param {Object} [options] Опции запроса.
 * @param {Boolean} [options.forced=false] Не учитывать закешированность моделей при запросе.
 * @return {no.Promise}
 */
no.request.models = function(models, options) {
    var request = new Request(models, options);

    return request.start();
};

/**
 * Дополнительные общие параметры запроса.
 * Эти параметры добавляются в любой запрос.
 * @public
 * @type {Object}
 */
no.request.requestParams = {};

/**
 * Добавляет к params, параметры из no.request.requestParams.
 * @param {Object} params Параметры запроса.
 */
no.request.addRequestParams = function(params) {
    no.extend(params, no.request.requestParams);
};

/**
 * Урл до сервера.
 * @type {String}
 */
no.request.URL = '/models/';

no.request.Manager = {

    /**
     * @enum {Number}
     */
    STATUS: {
        LOADING: 0,
        FAILED: 1,
        DONE: 2
    },

    _keys: {},

    /**
     * Добавляет запрос модели.
     * @param {no.Model} model Модель.
     * @param {Number} requestId ID запроса.
     * @param {Boolean} forced Флаг принудительного запроса.
     * @return {Boolean|no.Model} Если true - модель надо запросить, false - ничег не надо делать, no.Model - дождаться ресолва промиса возвращенной модели.
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
                model.status = model.STATUS.OK;
                model.retries = 0;
                return false;
            }

        } else {
            if (model.isValid() && !forced) {
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
     * @param {no.Model} model Модель
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
     * Удаляет модель из запросов. Вызывается после завершения no.request.model.
     * @param {no.Model[]} models Массив запрашиваемых моделей.
     */
    clean: function(models) {
        for (var i = 0, j = models.length; i < j; i++) {
            delete this._keys[models[i].key];
        }
    },

    /**
     * Записывает информацию о запросе.
     * @param {no.Model} model Запрашиваемая модель.
     * @param {Number} requestId ID запроса.
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

if (window['mocha']) {
    no.request.clean = function() {
        no.request.Manager._keys = {};
    }
}

var REQUEST_ID = 0;

//  ---------------------------------------------------------------------------------------------------------------  //

var Request = function(models, options) {
    /**
     * ID запроса.
     * @type {Number}
     * @private
     */
    this.id = REQUEST_ID++;

    /**
     * Массив запрашиваемых моделей
     * @type {no.Model[]}
     * @private
     */
    this.models = models;

    /**
     * Опции запроса.
     * @type {Object}
     * @private
     */
    this.options = options || {};

    this.promise = new no.Promise();
};

// ------------------------------------------------------------------------------------------------------------- //

Request.prototype.start = function() {
    var loading = [];
    var requesting = [];

    var models = this.models;
    for (var i = 0, l = models.length; i < l; i++) {
        var model = models[i];

        var addRequest = no.request.Manager.add(model, this.id, this.options.forced);
        if (addRequest === true) {
            requesting.push(model);

        } else if (addRequest instanceof no.Model) {
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
        no.request.addRequestParams(params);
        // отдельный http-promise нужен для того, чтобы реквест с этой моделью, запрашиваемой в другом запросе,
        // мог зарезолвится без завершения http-запроса
        httpRequest = no.http(no.request.URL + '?_m=' + modelsNames.join(','), params, 'POST'); // FIXME: Урл к серверной ручке.

        all = all.concat( requesting.map(model2Promise) );

    } else {
        // создаем фейковый зарезолвленный promise
        httpRequest = new no.Promise().resolve();
    }

    if (loading.length) {
        //  Ждем все остальные модели, которые должны загрузиться (уже были запрошены).
        all = all.concat( loading.map(model2Promise) );
    }

    //  Мы ждём какие-то данные:
    //    * либо мы запросили какие-то новые модели;
    //    * либо мы ждем ранее запрошенные модели.
    if (all.length) {
        var that = this;

        httpRequest.then(function(r) {
            //  В r должен быть массив из одного или двух элементов.
            if (requesting.length) {
                that.extract(requesting, r);
            }
        });

        // Ждем резолва всех моделей и "повторяем" запрос
        // Если какие-то ключи не пришли, они будут перезапрошены.
        no.Promise.wait(all).then(this.start.bind(this));

    } else {
        // у всех моделей есть какой-то статус (ERROR или OK)
        // вызываем чистку менеджера
        no.request.Manager.clean(this.models);

        // и резолвим весь no.request
        this.promise.resolve(this.models);
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

        var data, error;
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

        no.Model.store(model);

        // сообщаем менеджеру о завершении запроса этой модели
        // это не означает, что завершится весь no.request
        no.request.Manager.done(model);

        model.promise.resolve();
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
};

    /**
     * Приводит запрашиваемые модели к формату №3 из no.request.
     * @param items Массив названией моделей.
     * @param params Параметры моделей.
     * @return {Array}
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
     * @param {no.Model} model Модель
     * @return {no.Promise}
     */
    function model2Promise(model) {
        return model.promise;
    }

    /**
     * Приводит аргументы из no.request к моделям.
     * @param {String|Array|Object} items Массив названий моделей.
     * @param {Object} [params] Параметры моделей.
     * @return {no.Model[]}
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
            if (item.model && item.model instanceof no.Model) {
                models.push(item.model)
            } else {
                // можно не использовать if (!model.get()) { model.create() }
                // model.create все это умеет делать
                models.push(no.Model.create(item.id, item.params));
            }
        }

        return models;
    }

    function models2name(model) {
        return model.id;
    }

})();
