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
        if ( ns.Model.infoLite(model_id).isCollection ) {
            // Пока можно подписывать viewCollection только на одну modelCollection
            if (info.modelCollectionId && model_id !== info.modelCollectionId) {
                throw new Error("[ns.ViewCollection] '" + id + "' must depends on single ns.ModelCollection only");

            } else {
                info.modelCollectionId = model_id;
                info.isCollection = true;
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

ns.ViewCollection.prototype._init = function() {
    ns.View.prototype._init.apply(this, arguments);

    // В модели коллекции подмодели храняться массивом.
    // Плюс коллекция может быть разреженной.
    // Для пустых элементов коллекции будут генериться фейковые view.

    // Для реальных view лучше использовать hash.
    this.views = {};
};

/**
 * Биндится на изменение моделей.
 * @private
 */
ns.ViewCollection.prototype._bindModels = function() {
    var that = this;
    var models = this.models;

    for (var model_id in models) {
        var model = models[model_id];

        model.on('ns-model-destroyed', function() {
            that.invalidate();
        });

        model.on('ns-model-changed', function(evt, data) {
            // проинвалидируем view, только если изменилась внешняя модель
            if (this === data.model) {
                that.invalidate();
            }
        });
    }
};

ns.ViewCollection.prototype.isValid = function() {
    return this.isValidSelf() && this.isValidDesc();
};

ns.ViewCollection.prototype.isValidDesc = function() {
    for (var key in this.views) {
        if ( !this.views[key].isValid() ) {
            return false;
        }
    }
    return true;
};

/**
 * Возвращает true, если все модели валидны.
 * @param {Object} [modelsVersions] Также проверяем, что кеш модели не свежее переданной версии.
 * @return {Boolean}
 */
ns.ViewCollection.prototype.isModelsValid = function(modelsVersions) {
    var models = this.models;
    for (var id in models) {
        /** @type ns.Model|ns.ModelCollection */
        var model = models[id];
        var modelVersion = model.getVersion();
        // при сравнении с версией модели-коллекции используем versionSelf,
        // не зависящий от внутренних моделей
        if (model.isCollection()) {
            modelVersion = model.getSelfVersion();
        }

        if (
            // Модель является обязательной
            this.info.models[id] === true &&
            (
                // модель не валидна
                !model.isValid() ||
                // или ее кеш более свежий
                (modelsVersions && modelVersion > modelsVersions[id])
            )
        ) {
            return false;
        }
    }

    return true;
};

ns.ViewCollection.prototype._getView = function(id, params) {
    var key = ns.View.getKey(id, params);
    return this._getViewByKey(key);
};

ns.ViewCollection.prototype._getViewByKey = function(key) {
    return this.views[key] || null;
};

ns.ViewCollection.prototype._addView = function(id, params) {
    var view = this._getView(id, params);
    if (!view) {
        view = ns.View.create(id, params);
        // скрыть элементы коллекции бесмысленно, они скроются вместе с коллекцией,
        // поэтому обнуляем методы
        view._showNode = no.nop;
        view._hideNode = no.nop;

        this.views[view.key] = view;
    }

    return view;
};

ns.ViewCollection.prototype._deleteView = function(view) {
    delete this.views[view.key];
};

ns.ViewCollection.prototype._apply = function(callback) {
    var views = this.views;
    for (var key in views) {
        callback(views[key], views[key].id);
    }
};

ns.ViewCollection.prototype._getRequestViews = ns.View.prototype._tryPushToRequest;

ns.ViewCollection.prototype._getUpdateTree = function(tree, layout, params) {
    var decl;
    if (this.isValidSelf()) {
        decl = this._getPlaceholderTree(layout, params);
    } else {
        decl = this._getViewTree(layout, params);
    }

    // Добавим декларацию этого ViewCollection в общее дерево
    tree.views[this.id] = decl;

    return tree;
};

ns.ViewCollection.prototype._getDescViewTree = function(layout, params) {
    var split = this.info.split;
    var result = {};
    result[split.view_id] = [];

    // Какие элементы коллекции рендерить, мы можем понять только по модели
    // Поэтому, полезем внутрь, только если есть все данные
    if ( this.isModelsValid() ) {
        // ModelCollection
        var MC = this.models[this.info.modelCollectionId];

        // Проходом по элементам MC определим, какие виды нужно срендерить.
        // В коллекции могут быть дыры (разреженная коллекция).
        // Для дыр надо отрендерить вьюшки-заглушки.
        for (var i = 0; i < MC.models.length; i++) {
            var model = MC.models[i];
            var itemParams;
            var itemViewId;

            if (!model) {
                // Если не задана view для пустых элементов коллекции - не рендерим их.
                if (!split.empty_view_id) {
                    continue;
                }

                // Т.к. задано вью для пустых элементов - надо их отрендерить.
                itemViewId = split.empty_view_id;
                itemParams = no.extend({}, params, { index: i });
            } else {
                itemViewId = split.view_id;
                itemParams = no.extend({}, params, model.params);
            }

            var view = this._getView(itemViewId, itemParams);
            if (!view) {
                view = this._addView(itemViewId, itemParams);
            }

            var decl = null;
            if (this.isValidSelf()) {
                // Если корневая нода не меняется, то перерендериваем
                // только невалидные элементы коллекции
                if (!view.isValid()) {
                    if (view.info.isCollection && view.isValidSelf()) {
                        decl = view._getPlaceholderTree(layout, params);
                    } else {
                        decl = view._getViewTree(layout, params);
                    }
                }
            } else {
                // Если же мы решили перерендеривать корневую ноду, то придётся рендерить все
                // элементы коллекции. Невалидные - полностью, а валидные в виде placeholder'ов
                if (view.isValid()) {
                    decl = view._getPlaceholderTree(layout, params);
                } else {
                    decl = view._getViewTree(layout, params);
                }
            }

            if (decl) {
                result[split.view_id].push(decl);
            }
        }
    }

    return result;
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
        key: this.key,
        collection: true
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

    tree.views = this._getDescViewTree(layout, params);

    return tree;
};

ns.ViewCollection.prototype._updateHTML = function(node, layout, params, updateOptions, events) {
    var split = this.info.split;
    // Для VC нам всегда прийдёт новая нода
    var newNode = this._extractNode(node);
    var isOuterPlaceholder = $(newNode).hasClass('ns-view-placeholder');

    var viewWasInvalid = !this.isValid();
    var syncUpdate     = !updateOptions.async;

    var options_next;
    if (updateOptions.toplevel) {
        options_next = no.extend({}, updateOptions);
    } else {
        options_next = updateOptions;
    }

    if (!this.isValidSelf()) {

        var hadOldNode = !!this.node;

        if (!newNode) {
            throw new Error("[ns.ViewCollection] Can't find node for '" + this.id + "'");
        }

        // toplevel-блок -- это невалидный блок, выше которого все блоки валидны.

        // Либо блок toplevel и ему нужно вставить html,
        // либо его html уже вставился за счёт родителя (updateOptions.parent_added)

        if (updateOptions.toplevel) {

            // Если toplevel и placeholder, то не вставляем и в options для вложенных пишем toplevel
            // Если toplevel и не placeholder, то вставляем
            if (isOuterPlaceholder) {
                options_next.toplevel = true;
            } else {
                if (this.node) {
                    ns.replaceNode(this.node, newNode);
                }
                //  Все подблоки ниже уже не toplevel.
                options_next.toplevel = false;
                options_next.parent_added = true;

                this._setNode(newNode);
            }
        } else {
            // Если не toplevel и placeholder, то нужно взять placeholder и заменить его на актуальную ноду
            // Если не toplevel и не placeholder, то ничего не делаем
            if (isOuterPlaceholder) {
                ns.replaceNode(newNode, this.node);

                options_next.toplevel = false;
                options_next.parent_added = true;
            } else {
                this._setNode(newNode);
            }
        }

        if (hadOldNode && !this.isLoading()) {
            this._hide(events['ns-view-hide']);
            this._htmldestroy(events['ns-view-htmldestroy']);
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
        this._saveModelsVersions();
    }

    // Будем обновлять вложенные виды
    // только если это не первая отрисовка async-view
    if (!this.isLoading()) {
        // ModelCollection
        var MC = this.models[this.info.modelCollectionId];
        var itemsExist = {};

        // Контейнер потомков.
        var containerDesc;
        if (this.$node.is('.ns-view-container-desc')) {
            containerDesc = this.node;
        } else {
            containerDesc = ns.byClass('ns-view-container-desc', this.node)[0];
        }

        // Без него нельзя, т.к. если например при предыдущей отрисовке
        // ни один потомок не был отрендерен, а при текущей добавляются новые, непонятно,
        // в какое место их вставлять
        if (!containerDesc) {
            throw new Error("[ns.ViewCollection] Can't find descendants container (.ns-view-container-desc element) for '" + this.id + "'");
        }

        // Сначала сделаем добавление новых и обновление изменённых view
        // Порядок следования элементов в MC считаем эталонным и по нему строим элементы VC
        for (var i = 0; i < MC.models.length; i++) {
            var model = MC.models[i];
            var itemParams;
            var prev;
            var itemViewId;

            if (!model) {
                // Если для пустых элементов не задано view не рендерим их.
                if (!split.empty_view_id) {
                    continue;
                }

                // Задано view для пустых элементов колекции - значит их надо рендерить.
                itemViewId = split.empty_view_id;
                itemParams = no.extend({}, params, { index: i });
            } else {
                itemViewId = split.view_id;
                itemParams = no.extend({}, params, model.params);
            }

            // Получим view для вложенной модели
            // view для этой модели уже точно есть, т.к. мы его создали в _getUpdateTree.
            var view = this._getView(itemViewId, itemParams);

            // Здесь возможны следующие ситуации:
            if (isOuterPlaceholder) {
                // 1. html внешнего вида не менялся. Это значит, что вместо корневого html
                // нам пришёл placeholder, содержащий в себе те вложенные виды, которые нужно
                // перерендерить. Поэтому если
                //      1.1 view не валиден, то делаем _updateHtml и вставляем его в правильное
                //          место
                //      1.2 view валиден, то ничего не делаем
                if (!view.isValid()) {
                    view._updateHTML(newNode, null, params, options_next, events);

                    // поставим ноду в правильное место
                    if (prev) {
                        // Либо после предыдущего вида
                        $(prev.node).after(view.node);
                        // this.node.insertBefore(view.node, prev.node.nextSibling);
                    } else {
                        // Либо в самом начале, если предыдущего нет (т.е. это первый)
                        $(containerDesc).prepend(view.node);
                    }
                }
            } else {
                // 2. html внешнего вида только что изменился. Это значит, что он вставится в dom
                //    вместе с внутренними видами. Для невалидных там будет новый html, а для
                //    валидных там будет placeholder. Поэтому если
                //      1.1 view не валиден, то он уже занял правильное место в корневом html.
                //          Делаем _updateHtml
                //      1.2 view валиден, то заменим placeholder на правильный html.
                if (!view.isValid()) {
                   view._updateHTML(newNode, null, params, options_next, events);
                } else {
                    // здесь не нужно перевешивать события, т.к. они могут быть повешены
                    // либо непосредственно на ноду, либо на document. В первом случае
                    // события переедут вместе со старой нодой, а во втором останутся там,
                    // где и были раньше
                    ns.replaceNode(view._extractNode(newNode), view.node);
                }
            }

            itemsExist[view.key] = view;

            prev = view;
        }

        // Удалим те view, для которых нет моделей
        this._apply(function(/** ns.View */view) {
            // Если для view нет модели в MC, то нужно его прихлопнуть
            if (!itemsExist[view.key]) {
                // invalidate view and all subviews
                view.invalidate();

                //TODO: будет ли unbind для вложенных view?
                // unbind events
                view._hide(events['ns-view-hide']);
                view._htmldestroy(events['ns-view-htmldestroy']);

                // remove from collection
                this._deleteView(view);

                // remove from DOM
                ns.removeNode(view.node);
            }
        }.bind(this));
    }
};
