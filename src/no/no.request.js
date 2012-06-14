(function() {

//  ---------------------------------------------------------------------------------------------------------------  //
//  no.request
//  ---------------------------------------------------------------------------------------------------------------  //

no.request = function(items, params) {
    if (typeof items === 'string') {
        items = [ items ];
    }
    if (params) {
        items = normalizeItems(items, params);
    }

    var models = [];
    for (var i = 0, l = items.length; i < l; i++) {
        var item = items[i];

        var model = no.Model.get(item.id, item.params);
        if (!model) {
            model = no.Model.create(item.id, item.params);
        }

        models.push(model);
    }

    return no.request.models(models);

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
};

no.request.models = function(models) {
    var request = new Request(models);

    return request.start();
};

//  ---------------------------------------------------------------------------------------------------------------  //

var Request = function(models) {
    this.models = models;

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

        if (status === 'ok' || status === 'error') {
            //  Либо все загрузили успешно, либо кончились ретраи.
            //  Ничего не делаем в этом случае.
        } else if (status === 'loading') {
            //  Уже грузится.
            loading.push(model);
        } else {
            //  Проверяем, нужно ли (можно ли) запрашивает этот ключ.
            if (status === 'failed') {
                if (!model.canRetry()) {
                    //  Превышен лимит перезапросов или же модель говорит, что с такой ошибкой перезапрашиваться не нужно.
                    model.status = 'error';
                    continue;
                }
            }

            model.retries++;

            model.promise = new no.Promise();
            //  Ключ будет (пере)запрошен.
            model.status = 'loading';

            requesting.push(model);
        }
    }

    this.request(loading, requesting);

    return this.promise;
};

Request.prototype.request = function(loading, requesting) {
    var all = [];

    if (requesting.length) {
        //  Запрашиваем модели, которые нужно запросить.
        var params = models2params(requesting);
        all.push( no.http('/models/', params) ); // FIXME: Урл к серверной ручке.
    }

    if (loading.length) {
        //  Ждем все остальные модели, которые должны загрузиться (уже были запрошены).
        var promises = no.array.map(loading, function(model) {
            return model.promise;
        });
        all.push( no.Promise.wait(promises) );
    }

    //  Мы ждём какие-то данные:
    //    * либо мы запросили какие-то новые модели;
    //    * либо мы ждем ранее запрошенные модели.
    if (all.length) {
        var that = this;

        //  В r должен быть массив из одного или двух элементов.
        //  Если мы делали http-запрос, то в r[0] должен быть его результат.
        no.Promise.wait(all).then(function(r) {
            if (requesting.length) {
                that.extract(requesting, r[0]);
            }

            //  "Повторяем" запрос. Если какие-то ключи не пришли, они будут перезапрошены.
            //  Если же все получено, то будет выполнен: that.promise.resolve();
            that.start();
        });

    } else {
        this.promise.resolve(this.models);
    }
};

Request.prototype.extract = function(models, results) {
    var timestamp = +new Date();

    for (var i = 0, l = models.length; i < l; i++) {
        var model = models[i];
        var result = results[i];

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

//  ---------------------------------------------------------------------------------------------------------------  //

})();

