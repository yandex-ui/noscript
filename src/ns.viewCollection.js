/**
 * Views collection
 * @see https://github.com/pasaran/noscript/blob/master/doc/ns.viewCollection.md
 * @namespace
 * @augments ns.View
 * @constructor
 * @borrows ns.View.define as define
 */
ns.ViewCollection = function() {};

no.inherit(ns.ViewCollection, ns.View);

ns.ViewCollection.define = function(id, info) {
    info = info || {};
    var ctor = ns.View.define(id, info, ns.ViewCollection);

    // check for modelCollection
    for (var model_id in info.models) {
        // get lite info to prevent info processing
        if (ns.Model.infoLite(model_id).isCollection) {
            // Пока можно подписывать viewCollection только на одну modelCollection
            if (info.modelCollectionId && model_id !== info.modelCollectionId) {
                throw new Error("[ns.ViewCollection] '" + id + "' must depends on single ns.ModelCollection only");

            } else {
                info.modelCollectionId = model_id;
            }
        }
    }

    if (!info.modelCollectionId) {
        throw new Error("[ns.ViewCollection] '" + id + "' must depends on ns.ModelCollection");
    }

    if (!info.split || !info.split['view_id']) {
        throw new Error("[ns.ViewCollection] '" + id + "' must defines split.view_id");
    }

    return ctor;
};

ns.ViewCollection.prototype._getView = function(id, params) {
    var key = ns.View.getKey(id, params);
    return this._getViewByKey(key);
};

ns.ViewCollection.prototype._getViewByKey = function(key) {
    return this.views && this.views[key] || null;
};

ns.ViewCollection.prototype._addView = function(id, params) {
    var view = this._getView(id, params);
    if (!view) {
        view = ns.View.create(id, params);
        this.views[view.key] = view;
    }

    return view;
};

ns.ViewCollection.prototype._apply = function(callback) {
    var views = this.views;
    for (var key in views) {
        callback(views[key], views[key].id);
    }
};

ns.ViewCollection.prototype._getRequestViews = function(updated) {
    /**
     * Флаг, означающий, что view грузится асинхронно.
     * @type {Boolean}
     */
    this.asyncState = false;

    if (this.async) {
        var hasValidModels = this.isModelsValid();
        var hasValidStatus = this.isOk();
        if (hasValidModels && !hasValidStatus) {
            // если асинхронный блок имеет валидные модели, но невалидный статус - рисуем его синхронно
            updated.sync.push(this);

        } else if (!hasValidModels) {
            this.asyncState = true;
            // если асинхронный блок имеет невалидные модели, то его не надо рисовать
            updated.async.push(this);
            // прекращаем обработку
            return updated;
        }
    } else if (!this.isValid()) {
        // если обычный блок не валиден
        updated.sync.push(this);
    }

    // Если views еще не определены (первая отрисовка)
    if (!this.views) {
        this.views = {};
    }

    return updated;
};

ns.ViewCollection.prototype._getUpdateTree = function(tree, layout, params) {
    // Добавим декларацию этого ViewCollection в общее дерево
    tree.views[this.id] = this._getViewTree(layout, params);

    return tree;
};

ns.ViewCollection.prototype._getViewTree = function(layout, params) {
    var tree = {
        async: false,
        // фейковое дерево, чтобы удобно матчится в yate
        tree: {},
        // всегда собираем данные, в том числе закешированные модели для async-view
        models: this._getModelsData(),
        //  добавляем собственные параметры блока
        //  NOTE @nop: Отличаются ли эти параметры от page.params?
        params: this.params,
        //  FIXME: Не должно ли оно приходить в параметрах Update'а?
        page: ns.page.current,
        views: {},
        key: this.key
    };

    // добавляем название view, чтобы можно было писать
    // match .view-name ns-view-content
    tree.tree[this.id] = true;

    //  Если это асинхронный блок и для него на самом деле нет еще всех моделей,
    //  помечаем его как асинхронный (false).
    //  Но может случиться так, что асинхронный запрос пришел раньше синхронного,
    //  тогда этот асинхронный блок будет нарисован вместе с остальными синхронными блоками.
    if ( this.async && !this.isModelsValid() ) {
        tree.async = true;
    }

    // Какие элементы коллекции рендерить, мы можем понять только по модели
    // Поэтому, полезем внутрь, только если есть все данные
    if (this.isModelsValid()) {
        // ModelCollection
        var MC = this.models[this.info.modelCollectionId];
        var itemsToRender = [];

        // Проходом по элементам MC определим, какие виды нужно срендерить
        for (var i = 0, view, p; i < MC.models.length; i++) {
            p    = no.extend({}, params, MC.models[i].params);
            view = this._getView(this.info.split.view_id, p);

            if (!view) {
                view = this._addView(this.info.split.view_id, p);
            }

            if (!view.isValid()) {
                itemsToRender.push(
                    view._getViewTree(layout, params)
                );
            }
        }

        tree.views[this.info.split.view_id] = itemsToRender;
    }

    return tree;
};

ns.ViewCollection.prototype._updateHTML = function(node, layout, params, updaterOptions, events) {
    // Для VC нам всегда прийдёт новая нода
    var newNode = ns.byClass('ns-view-' + this.id, node)[0];

    var viewWasInvalid = !this.isValid();
    var syncUpdate     = !updaterOptions.async;

    // FIXME: А ещё нужно обработать кейс, когда родительский вид обновил свою ноду
    // сейчас при таких обстоятельствах viewCollection ломается (не показываются элементы)

    if (viewWasInvalid) {
        // Будем что-то делать с нодой только в 2-х случаях
        if (!this.node) {
            // Если это первая отрисовка
            // Засетим ноду
            this._setNode(newNode);
            // Тут я сделал предположение, что нода этого вида вставится сама за счёт верхних
            // видов (как у бокса) и думать об этом не надо

        } else if (this.isLoading()) {
            // Если это вторая отрисовка async view
            // заменим ноду
            ns.replaceNode(this.node, newNode);
            // и засетим
            this._setNode(newNode);

        } else {
            this._hide(events['ns-view-hide']);
            this._htmldestroy(events['ns-view-htmldestroy']);

            // В остальных случаях считаем viewCollection валидным
            this.status = this.STATUS.OK;
        }

        if ( this.isOk() ) {
            this._htmlinit(events['ns-view-htmlinit']);

        } else if (this.isLoading()) {
            // В асинхронном запросе вызываем async для view, которые являются заглушкой.
            events['ns-view-async'].push(this);
        }
    }

    // Если view валидный и не в async-режиме, то вызывается show и repaint
    // Для валидных view при втором проходе (когда отрисовываются asynс-view) не надо второй раз кидать repaint

    // Условие звучит так "(Если мы в синхнронном ns.Update и view стал валиден) или (view был не валиден и стал валиден)"
    // Второе условие относится как к перерисованным view, так и к async-view, которые полностью отрисовались
    if ( (syncUpdate || viewWasInvalid) && this.isOk() ) {
        // событие show будет вызвано, если у view поменяется this._visible
        this._show(events['ns-view-show']);
        events['ns-view-repaint'].push(this);
        this.timestamp = +new Date();
    }

    // Будем обновлять вложенные виды
    // только если этот блок был не валиден и это не первая отрисовка async-view
    if (!this.isLoading()) {
        // ModelCollection
        var MC = this.models[this.info.modelCollectionId];
        var itemsExist = {};

        // Сначала сделаем добавление новых и обновление изменённых view
        // Порядок следования элементов в MC считаем эталонным и по нему строим элементы VC
        for (var i = 0, view, wasValid, prev, p; i < MC.models.length; i++) {
            // у нас тут для каждого элемента MC уже есть
            //  1. либо валидный view,
            //  2. либо невалидный view с собственным устаревшим html и новый html для него,
            //  3. либо невалидный view без собственного устаревшего html и новый html для него

            p    = no.extend({}, params, MC.models[i].params);
            // Получим view для этой модели
            view = this._getView(this.info.split.view_id, p);

            wasValid = view.isValid();

            // Если у него была старая нода, она заменится сама в _updateHTML
            view._updateHTML(newNode, null, params, updaterOptions, events);

            // Если до _updateHTML был невалиден
            if (!wasValid) {
                // поставим ноду в правильное место
                if (prev) {
                    // Либо после предыдущего вида
                    this.node.insertBefore(view.node, prev.node.nextSibling);
                } else {
                    // Либо в самом начале, если предыдущего нет (т.е. это первый)
                    this.node.insertBefore(view.node, this.node.firstChild);
                }
            }

            itemsExist[view.key] = view;

            prev = view;
        }

        // Удалим те view, для которых нет моделей
        this._apply(function(/** ns.View */view) {
            // Если для вида нет модели в MC, то нужно его прихлопнуть
            if (!itemsExist[view.key]) {
                view.invalidate();
                view._hide(events['ns-view-hide']);
                view._htmldestroy(events['ns-view-htmldestroy']);
            }
        });
    }
};
