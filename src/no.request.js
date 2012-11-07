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
 * @return {no.Promise}
 */
no.request = function(items, params) {
    return no.request.models(items2models(items, params));
};

/**
 * Делает запрос моделей с сервера, не учитывая их закешированности.
 * @see no.request
 * @param {String|Array|Object} items Массив названий моделей.
 * @param {Object} [params] Параметры моделей.
 * @return {no.Promise}
 */
no.forcedRequest = function(items, params) {
    return no.request.models(items2models(items, params), true);
};

/**
 * Делает запрос моделей с сервера.
 * @param {no.Model[]} models Массив моделей.
 * @param {Boolean} [forced=false] Не учитывать закешированность моделей при запросе.
 * @return {no.Promise}
 */
no.request.models = function(models, forced) {
    var request = new Request(models, forced);

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

var REQUEST_ID = 0;

//  ---------------------------------------------------------------------------------------------------------------  //

var Request = function(models, forced) {
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
     * Флаг, что запрос не должен учитывать закешированность моделей.
     * @type {Boolean}
     * @private
     */
    this.forced = forced;

    this.promise = new no.Promise();
};

// ------------------------------------------------------------------------------------------------------------- //

Request.prototype.start = function() {
    var loading = [];
    var requesting = [];

    var models = this.models;
    for (var i = 0, l = models.length; i < l; i++) {
        var model = models[i];
        var status = model.status;

        if (
            // если STATUS_OK и не force-запрос
            (status === model.STATUS_OK && !this.forced) ||
            // если STATUS_OK, force-запрос и он был получен этим запросом
            (status === model.STATUS_OK && this.forced && model.requestID === this.id) ||
            (status === model.STATUS_ERROR)
        ) {
            //  Либо все загрузили успешно, либо кончились ретраи.
            //  Ничего не делаем в этом случае.

        } else if (status === model.STATUS_LOADING && !this.forced) {
            //  Уже грузится.
            loading.push(model);

        } else if (status === model.STATUS_LOADING && this.forced) {
            // TODO: unit-тесты на это поведение
            // Если запрос forced, но модель уже грузится
            // retries увеличивать не надо
            // новый promise создавать не надо, чтобы отрезолвить и первый запрос и этот
            model.requestID = this.id;
            // добавляем модель в запрос
            requesting.push(model);

        } else {
            //  Проверяем, нужно ли (можно ли) запрашивает этот ключ.
            if (status === model.STATUS_FAILED) {
                if (!model.canRetry()) {
                    //  Превышен лимит перезапросов или же модель говорит, что с такой ошибкой перезапрашиваться не нужно.
                    model.status = model.STATUS_ERROR;
                    continue;
                }
            }

            model.retries++;

            model.promise = new no.Promise();
            //  Ключ будет (пере)запрошен.
            model.status = model.STATUS_LOADING;
            // сохраняем в моделе ID запроса, который ее запрашивает
            model.requestID = this.id;

            requesting.push(model);
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
        no.request.addRequestParams(params);
        // отдельный http-promise нужен для того, чтобы реквест с этой моделью, запрашиваемой в другом запросе,
        // мог зарезолвится без завершения http-запроса
        httpRequest = no.http('/models/', params); // FIXME: Урл к серверной ручке.

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
        this.promise.resolve(this.models);
    }
};

Request.prototype.extract = function(models, results) {
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

        //TODO: store не надо делать, потому что no.Model.create уже это делает
        no.Model.store(model);

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

            // можно не использовать if (!model.get()) { model.create() }
            // model.create все это умеет делать
            models.push(no.Model.create(item.id, item.params));
        }

        return models;
    }

})();
