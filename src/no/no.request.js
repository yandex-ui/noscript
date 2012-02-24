// ------------------------------------------------------------------------------------------------------------- //
// no.Request
// ------------------------------------------------------------------------------------------------------------- //

/**
    @param {Array.<no.Request.type_group>} group Groups to request.
    @param {boolean=} autoretry Whether this request must autoretry or not.
        For example: we have models, that were not loaded and we cannot request (do not have params).
        autoretry === true: we fail this request
        autoretry === false: we wait someone to call send() method, when, maybe, we have more params.
        default: true
*/
no.Request = function(groups, autoretry) {
    this.groups = groups;
    this.autoretry = autoretry === undefined ? true : autoretry;

    this.promise = new no.Promise();

    this._leftovers = 0;
    this._models_count = 0;
    this.status = "ready"; // active | waiting | done
};

no.extend(no.Request.prototype, no.Events);

// ----------------------------------------------------------------------------------------------------------------- //
// Typedefs.

/**
    @typedef {{
        models: Array.<string>,
        params: Object
    }}
*/
no.Request.type_group;

// ------------------------------------------------------------------------------------------------------------- //

no.Request.prototype.start = function() {
    var ungrouped = this.ungroup();
    var models = ungrouped.models;
    var can_request = this.canRequest(ungrouped);

    if (!can_request) {
        this.status = "waiting";

        if (this.autoretry) {
            this.status = "done";
            this.promise.resolve();
        }

        return this.promise;
    }

    this._leftovers = ungrouped.leftovers;
    this._models_count = models.length;

    var that = this;
    this.requestModels(models).then(function() {
        that.status = "ready";

        if (ungrouped.leftovers) { // Если после этого прохода остались незапрошенные данные -- повторяем процедуру.
            that.start(); // processParams вызывается внутри ungroup
        } else {
            that.processParams([]);
            that.promise.resolve();
        }

        that.trigger("gotData");
    });

    return this.promise;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    Проверяем, поменялось ли что-то после последнего запроса моделей.
*/
no.Request.prototype.canRequest = function(ungrouped) {
    var models = ungrouped.models;

    var leftovers_changed = (this._leftovers - ungrouped.leftovers) !== 0; // Количество моделей, которые мы пока не можем запросить, поменялось.
    var models_number_changed = (this._models_count - models.length) !== 0; // Количество запрашиваемых моделей поменялось.

    return models_number_changed || leftovers_changed;
};

// ----------------------------------------------------------------------------------------------------------------- //

no.Request.prototype.send = function() {
    this.start();
};

// ----------------------------------------------------------------------------------------------------------------- //

no.Request.prototype.processParams = function(uncached) {
    var groups = this.groups;
    for (var i = 0, l = groups.length; i < l; i++) {
        var group = groups[i];

        var models = group.models;
        var params = group.params;

        for (var j = 0, m = models.length; j < m; j++) {
            var model_id = models[j];

            var model = no.Model.get( model_id, params );
            if ( model && model.isValid() ) { // Модели, которые уже есть в кэше и валидны - запрашивать не надо.
                model.processParams(params);
            } else {
                uncached.push({
                    model_id: model_id,
                    params: params
                });
            }
        }
    }
}

no.Request.prototype.ungroup = function() {
    var uncached = [];
    this.processParams(uncached);

    var models = [];
    var leftovers = 0;

    for (var i = 0, l = uncached.length; i < l; i++) {
        var item = uncached[i];
        var model_id = item.model_id;

        var model = no.Model.get( model_id, item.params );
        if (!model) {
            model = no.Model.create( model_id, item.params );
        }

        var reqParams = model.getReqParams(); // Модель может быть запрошена тогда, когда для её запроса есть всё необходимые параметры.
        if (reqParams) {
            models.push(model);
            no.Model.set(model); // Модель можно запрашивать, поэтому мы уже можем построить для неё валидный ключ и можно её сохранить в кэше моделей.
        } else {
            leftovers++;
        }
    }

    return {
        models: models, // Модели, которые нужно/можно запросить сейчас.
        leftovers: leftovers // То, что по причине отсутствия необходимых параметров, отложено на следующий проход.
    };
};

// ------------------------------------------------------------------------------------------------------------- //

no.Request.prototype.requestModels = function(models) {
    var request = new no.Request.Models(models);
    this.status = "active";
    return request.start();
};

// ------------------------------------------------------------------------------------------------------------- //
// no.Request.Models
// ------------------------------------------------------------------------------------------------------------- //

no.Request.Models = function(models) {
    this.models = models;

    this.promise = new no.Promise();
};

// ------------------------------------------------------------------------------------------------------------- //

no.Request.Models.prototype.start = function() {
    var loading = [];
    var requesting = [];

    var models = this.models;
    for (var i = 0, l = models.length; i < l; i++) {
        var model = models[i];
        var status = model.status;

        if (status === 'ok' || status === 'error') { // Либо все загрузили успешно, либо кончились ретраи.
            // Do nothing.
        } else if (status === 'loading') { // Уже грузится.
            loading.push(model);
        } else {
            // Проверяем, нужно ли (можно ли) запрашивает этот ключ.
            if (status === 'failed') {
                if (!model.canRetry()) {
                    model.status = 'error'; // Превышен лимит перезапросов или же модель говорит, что с такой ошибкой перезапрашиваться не нужно.
                    continue;
                }
            }

            model.retries++;

            model.promise = new no.Promise();
            model.status = 'loading'; // Ключ будет (пере)запрошен.

            requesting.push(model);
        }
    }

    this.request(loading, requesting);

    return this.promise;
};

no.Request.Models.prototype.request = function(loading, requesting) {
    var all = [];

    if (requesting.length) { // Запрашиваем модели, которые можно запросить.
        var params = no.Request.Models.models2params(requesting);
        all.push( no.http('/models/', params) ); // FIXME: Урл к серверной ручке.
    }

    if (loading.length) { // Ждём все остальные модели, которые должны загрузиться (уже были запрошены).
        var promises = no.array.map( loading, function(model) {
            return model.promise;
        });
        all.push( no.Promise.wait(promises) );
    }

    // Мы ждём какие-то данные:
    // - либо мы запросили какие-то новые модели;
    // - либо мы ждём ранее запрошенные модели (получив их мы, может быть, сможем запросить ещё другие модели).
    if (all.length) {
        var that = this;

        // В r должен быть массив из одного или двух элементов.
        // Если мы делали http-запрос, то в r[0] должен быть его результат.
        no.Promise.wait(all).then(function(r) {
            if (requesting.length) {
                that.extract(requesting, r[0]);
            }

            // "Повторяем" запрос. Если какие-то ключи не пришли, они будут перезапрошены.
            // Если же все получено, то будет выполнен: this.promise.resolve();
            that.start();
        });

    } else {
        this.promise.resolve();
    }
};

no.Request.Models.models2params = function(models) {
    var params = {};

    for (var i = 0, l = models.length; i < l; i++) {
        var suffix = '.' + i; // Чтобы не путать параметры с одинаковыми именами разных моделей,
                              // добавляем к именам параметров специальный суффикс.
        var model = models[i];

        // Каждая модель прокидывает в params все свои параметры (кроме служебных вида _<name>).
        var mParams = model.getReqParams();
        for (var key in mParams) {
            if (!/^_/.test(key)) { // Служебные параметры (начинающиеся на '_') игнорируем.
                params[ key + suffix ] = mParams[key];
            }
        }

        params[ '_model' + suffix ] = model.id;
    }

    return params;
};

no.Request.Models.prototype.extract = function(models, results) {
    var timestamp = +new Date();

    for (var i = 0, l = models.length; i < l; i++) {
        var model = models[i];
        var result = results[i];

        if (!result) {
            model.error = {
                id: 'NO_DATA',
                reason: 'Server returned no data'
            };
            model.status = 'failed';
        } else {
            var data = model.extractData(result);
            if (data) {
                model.data = data;
                model.status = 'ok';
            } else {
                model.error = model.extractError(result);
                model.status = 'failed';
            }
        }
        model.promise.resolve();
    }
};

