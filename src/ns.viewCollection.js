/**
 * Создает коллекцию видов.
 * @classdesc Коллекция видов.
 * @tutorial ns.viewCollection
 * @augments ns.View
 * @constructor
 */
ns.ViewCollection = function() {};

// скопируем статические методы
no.extend(ns.ViewCollection, ns.View);
// унаследуем прототип
no.inherit(ns.ViewCollection, ns.View);

/**
 *
 * @param {string} id
 * @param {object} info
 * @param {function|string} baseClass
 * @returns {ns.View}
 */
ns.ViewCollection.define = function(id, info, baseClass) {
    info = info || {};

    baseClass = baseClass || this;
    var ctor = ns.View.define.call(this, id, info, baseClass);

    ns.assert(info.split, 'ns.ViewCollection', "'%s'  must define 'split' section", id);
    ns.assert(info.split.intoViews, 'ns.ViewCollection', "'%s'  must define 'split.intoViews' section", id);
    ns.assert(info.split.byModel, 'ns.ViewCollection', "'%s'  must define 'split.byModel' section", id);

    var isValidModelCollection = (info.split.byModel in info.models) && ns.Model.infoLite(info.split.byModel).isCollection;
    ns.assert(isValidModelCollection, 'ns.ViewCollection', "'%s'  must depend on ns.ModelCollection", id);

    info.isCollection = true;
    info.modelCollectionId = info.split.byModel;

    return ctor;
};

/**
 * События моделей, обрабатываемые видом по умолчанию
 */
ns.ViewCollection.eventsModelCollectionDefault = {
    'ns-model-insert': 'keepValid',
    'ns-model-remove': 'keepValid',
    'ns-model-changed':  'invalidate',
    'ns-model-destroyed': 'invalidate'
};

/**
 * Преобразует декларацию в виде массива ['model1', 'model2', ...]
 * в объект {model1: 'handlerDefault1', model2: 'handlerDefault2', ...}
 * @param {array} decls
 * @return {object}
 * @private
 */
ns.ViewCollection._expandModelsDecl = function(decls) {
    if (!Array.isArray(decls)) {
        return decls;
    }

    var declsExpanded = {};

    for (var i = 0, l = decls.length; i < l; i++) {
        var idModel = decls[i];
        if (ns.Model.infoLite(idModel).isCollection) {
            declsExpanded[idModel] = no.extend({}, this.eventsModelCollectionDefault);
        } else {
            declsExpanded[idModel] = no.extend({}, this.defaultModelEvents);
        }
    }

    return declsExpanded;
};

/**
 * Инициализирует экземпляр вида
 * @private
 */
ns.ViewCollection.prototype._init = function() {
    ns.View.prototype._init.apply(this, arguments);
};

/**
 * Вызывает обработчик события модели
 */
ns.ViewCollection.prototype._invokeModelHandler = function(handler, model, e, o) {
    // Отфильтруем события вложенных моделей
    if (o && o.model) {
        return;
    }

    this._saveModelVersion(model.id);
    return handler.apply(this, Array.prototype.slice.call(arguments, 2));
};

/**
 * @borrows ns.View.prototype._getModelVersion as ns.ViewCollection.prototype._getModelVersion
 */
ns.ViewCollection.prototype._getModelVersion = function(modelId) {
    var model = this.models[modelId];
    var modelVersion;

    if (modelId === this.info.modelCollectionId) {
        // для зависимой модели-коллекции берем собственную версию,
        // которая не зависит от элементов коллекции
        modelVersion = model.getSelfVersion();

    } else {
        modelVersion = model.getVersion();
    }

    return modelVersion;
};

/**
 *
 * @returns {boolean}
 */
ns.ViewCollection.prototype.isValid = function() {
    return this.isValidSelf() && this.isValidDesc();
};

/**
 *
 * @returns {boolean}
 */
ns.ViewCollection.prototype.isValidDesc = function() {
    for (var key in this.views) {
        if (!this.views[key].isValid()) {
            return false;
        }
    }
    return true;
};

/**
 * Делает вид невалидным.
 * @description Cтатус валидности самой коллекции и ее элементов рассчитыается независимо.
 * Поэтому этот метод инвалидирует только себя и оставляет элементы коллекции без изменений.
 */
ns.ViewCollection.prototype.invalidate = function() {
    if (this.status === this.STATUS.OK) {
        // меняем статус только у валидных видов,
        // т.к. есть еще статус NONE
        this.status = this.STATUS.INVALID;
    }
};

/**
 * @borrows ns.View.prototype.invalidate as ns.ViewCollection.prototype.invalidateAll
 */
ns.ViewCollection.prototype.invalidateAll = ns.View.prototype.invalidate;

/**
 *
 * @param {string} id
 * @param {object} params
 * @returns {*}
 * @private
 */
ns.ViewCollection.prototype._getView = function(id, params) {
    var key = ns.View.getKey(id, params);
    return this._getViewByKey(key);
};

/**
 *
 * @param {string} key
 * @returns {ns.View}
 * @private
 */
ns.ViewCollection.prototype._getViewByKey = function(key) {
    return this.views && this.views[key] || null;
};

/**
 *
 * @param {string} id
 * @param {object} params
 * @returns {ns.View}
 * @private
 */
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

/**
 *
 * @param {ns.View} view
 * @private
 */
ns.ViewCollection.prototype._deleteView = function(view) {
    delete this.views[view.key];
};

/**
 *
 * @param {function} callback
 * @private
 */
ns.ViewCollection.prototype._apply = function(callback) {
    var views = this.views;
    for (var key in views) {
        callback(views[key], views[key].id);
    }
};

ns.ViewCollection.prototype._getRequestViews = function(updated, pageLayout) {
    // у ViewCollection нет детей в обычном понимании,
    // поэтому не нужно хождение вниз по дереву как в ns.View#_getRequestViews

    // TODO: вроде бы ничего не мешает не переопределять этот метод и дать возможность коллекции иметь детей
    // Все элементы коллекции в контейнере, а коллекция может иметь собственную разметку, в т.ч. с другими видами

    this._saveLayout(pageLayout);

    // При необходимости добавим текущий вид в список "запрашиваемых"
    return this._addSelfToUpdate(updated);
};

/**
 *
 * @param {object} tree
 * @param {object} layout
 * @param {object} params
 * @returns {ns.View~UpdateTree}
 * @private
 */
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

ns.ViewCollection.prototype._forEachCollectionItem = function(cb, params) {
    // ModelCollection
    var MC = this.models[this.info.modelCollectionId];

    // Какие элементы коллекции рендерить, мы можем понять только по модели
    // Поэтому, полезем внутрь, только если в ней есть данные
    if (MC.isValid()) {
        var modelItems = MC.models;
        // Проходом по элементам MC определим, какие виды нужно срендерить
        for (var i = 0, j = modelItems.length; i < j; i++) {
            var viewItem = this._getViewItem(modelItems[i], params);

            // если нет viewId, то это значит, что элемент коллекции был отфильтрован
            if (!viewItem.id) {
                continue;
            }

            var view = this._addView(viewItem.id, viewItem.params);

            cb(view);
        }
    }
};

/**
 *
 * @param {object} layout
 * @param {object} params
 * @returns {object.<string, ns.View~UpdateTree>}
 * @private
 */
ns.ViewCollection.prototype._getDescViewTree = function(layout, params) {
    var that = this;
    var result = {};
    result['ns-view-collection-container'] = [];

    this._forEachCollectionItem(function(view) {
        var decl = null;
        if (that.isValidSelf()) {
            // Если корневая нода не меняется, то перерендериваем
            // только невалидные элементы коллекции
            if (view.info.isCollection && view.isValidSelf()) {
                decl = view._getPlaceholderTree(layout, params);
            } else if (!view.isValid()) {
                decl = view._getViewTree(layout, params);
            }
        } else {
            // Если же мы решили перерендеривать корневую ноду, то придётся рендерить все
            // элементы коллекции. Невалидные - полностью, а валидные в виде placeholder'ов
            if (view.isValidSelf()) {
                // если view - обычный вид, то isValidSelf === isValid
                // если view - коллекция, то она проверит себя (isValidSelf) и сделаем дерево для детей
                decl = view._getPlaceholderTree(layout, params);

            } else {
                decl = view._getViewTree(layout, params);
            }
        }

        if (decl) {
            /*
             тут создаем специальное дерево, чтобы рендерить разнородные элементы как и обычные виды

             {
             'views': {
             // массив разнородных элементов коллекции
             'ns-view-collection': [
             {
             'view-item-type1': { ... дерево ... }
             },
             {
             'view-item-type2': { ... дерево ... }
             },
             {
             'view-item-type2': { ... дерево ... }
             },
             {
             'view-item-type1': { ... дерево ... }
             }
             ]
             }
             }

             */
            var viewItemTree = {};
            viewItemTree[view.id] = decl;
            result['ns-view-collection-container'].push(viewItemTree);
        }
    }, params);

    return result;
};

/**
 *
 * @param {object} layout
 * @param {object} params
 * @returns {ns.View~UpdateTree}
 * @private
 */
ns.ViewCollection.prototype._getViewTree = function(layout, params) {
    var tree = this._getTree();
    tree.collection = true;
    // всегда собираем данные, в том числе закешированные модели для async-view
    tree.models = this._getModelsForTree();

    tree.views = this._getDescViewTree(layout, params);

    return tree;
};

/**
 *
 * @param {HTMLElement} node
 * @param {object} layout
 * @param {object} params
 * @param {object} updateOptions
 * @param {object} events
 * @private
 */
ns.ViewCollection.prototype._updateHTML = function(node, layout, params, updateOptions, events) {
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

    if (this.isValidSelf()) {
        // Если не toplevel и placeholder, то нужно взять placeholder (newNode) и заменить его на актуальную ноду (this.node)
        if (!updateOptions.toplevel && isOuterPlaceholder) {
            // Эта ситуация, когда родитель коллекции перерисовался,
            // а эта коллекция рисуется как placeholder
            ns.replaceNode(newNode, this.node);

            // ставим toplevel, чтобы дети себя вставили
            options_next = no.extend({}, updateOptions);
            options_next.toplevel = true;
            options_next.parent_added = true;
        }

    } else {

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

    // Если view валидный и не в async-режиме, то вызывается show и touch 
    // Для валидных view при втором проходе (когда отрисовываются asynс-view) не надо второй раз кидать touch

    // Условие звучит так "(Если мы в синхнронном ns.Update и view стал валиден) или (view был не валиден и стал валиден)"
    // Второе условие относится как к перерисованным view, так и к async-view, которые полностью отрисовались
    if ( (syncUpdate || viewWasInvalid) && this.isOk() ) {
        // событие show будет вызвано, если у view поменяется this._visible
        this._show(events['ns-view-show']);
        events['ns-view-touch'].push(this);
        this._saveModelsVersions();
    }

    // Будем обновлять вложенные виды
    // только если это не первая отрисовка async-view
    if (!this.isLoading()) {
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

        // Коллекции могут быть вложенны рекурсивно,
        // но плейсхолдер отрисуется только для самых верних,
        // поэтому на всякий случай поставляем сюда свою текущую ноду
        newNode = newNode || this.node;

        var prev;
        // Сначала сделаем добавление новых и обновление изменённых view
        // Порядок следования элементов в MC считаем эталонным и по нему строим элементы VC
        this._forEachCollectionItem(function(view) {
            // Здесь возможны следующие ситуации:
            if (isOuterPlaceholder) {
                // 1. html внешнего вида не менялся. Это значит, что вместо корневого html
                // нам пришёл placeholder, содержащий в себе те вложенные виды, которые нужно
                // перерендерить. Поэтому если
                //      1.1 view не валиден, то делаем _updateHtml и вставляем его в правильное
                //          место
                //      1.2 view валиден, то ничего не делаем
                var viewItemWasInValid = !view.isValid();

                // updateHTML надо пройти в любом случае,
                // чтобы у всех элементов коллекции сгенерились правильные события
                view._updateHTML(newNode, null, params, options_next, events);

                if (viewItemWasInValid) {
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

                var viewItemWasValid = view.isValid();

                // updateHTML надо пройти в любом случае,
                // чтобы у всех элементов коллекции сгенерились правильные события
                view._updateHTML(newNode, null, params, options_next, events);

                if (viewItemWasValid) {
                    // здесь не нужно перевешивать события, т.к. они могут быть повешены
                    // либо непосредственно на ноду, либо на document. В первом случае
                    // события переедут вместе со старой нодой, а во втором останутся там,
                    // где и были раньше
                    ns.replaceNode(view._extractNode(newNode), view.node);
                }
            }

            itemsExist[view.key] = view;

            prev = view;
        }, params);

        // Удалим те view, для которых нет моделей
        this._apply(function(/** ns.View */view) {
            // Если для view нет модели в MC, то нужно его прихлопнуть
            if (!itemsExist[view.key]) {
                // invalidate view
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

/**
 *
 * @private
 */
ns.ViewCollection.prototype._getViewItem = function(modelItem, updateParams) {
    var viewItemParams = no.extend({}, updateParams, modelItem.params);

    var viewId;
    var infoViewId = this.info.split.intoViews;
    if (typeof infoViewId === 'function') {
        // если intoViews - функция, то передаем туда модель и параметры,
        // а она должна вернуть id вида
        viewId = infoViewId.call(this, modelItem, viewItemParams);
    } else {
        viewId = infoViewId;
    }

    return {
        id: viewId,
        params: viewItemParams
    };
};
