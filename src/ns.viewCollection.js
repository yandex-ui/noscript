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

    // TODO: test
    ns.assert(!(info.split.intoViews && info.split.intoLayouts), 'ns.ViewCollection', "'%s' can't define 'split.intoViews' and 'split.intoLayouts' sections at same time", id);

    if (typeof info.split.intoViews === 'string') {
        var autogenerateLayoutId = ns.layout.generateSimple(info.split.intoViews, 'ns-auto-layout-' + id);
        delete info.split.intoViews;
        /* jshint -W054 */
        info.split.intoLayouts = new Function('', 'return "' + autogenerateLayoutId + '"');

    } else if (typeof info.split.intoViews === 'function') {
        info.split.intoLayouts = function(model, params) {
            var viewId = info.split.intoViews.call(this, model, params);
            if (viewId) {
                // генерируем динамически layout и возвращаем его
                return ns.layout.generateSimple(viewId, 'ns-auto-layout-' + id);
            }

            return null;
        };
    }

    ns.assert(info.split.intoLayouts, 'ns.ViewCollection', "'%s'  must define 'split.intoLayouts' section", id);
    ns.assert(info.split.byModel, 'ns.ViewCollection', "'%s'  must define 'split.byModel' section", id);

    var isValidModelCollection = (info.split.byModel in info.models) && ns.Model.infoLite(info.split.byModel).isCollection;
    ns.assert(isValidModelCollection, 'ns.ViewCollection', "'%s'  must depend on ns.ModelCollection", id);

    info.isCollection = true;
    info.modelCollectionId = info.split.byModel;

    return ctor;
};

ns.ViewCollection.prototype.__customInit = function() {
    /**
     * Массив видов, которые надо уничтожить на стадии _updateHTML.
     * @type {array}
     * @private
     */
    this.__itemsToRemove = [];

    // эти два хеша нужны, чтобы по modelItem быстро найти его viewItem

    /**
     * Хеш modelItem.key: viewItem
     * @type {object}
     * @private
     */
    this.__model2View = {};

    /**
     * Хеш viewItem.key: modelItem.key
     * @type {object}
     * @private
     */
    this.__view2ModelKey = {};
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
 * Проходится по всем видам-элементам коллекции в порядке модели-коллекции.
 * @param {function} cb
 */
ns.ViewCollection.prototype.forEachItem = function(cb) {
    // ModelCollection
    var MC = this.models[this.info.modelCollectionId];
    // Какие элементы коллекции рендерить, мы можем понять только по модели
    // Поэтому, полезем внутрь, только если в ней есть данные
    if (MC.isValid()) {
        var modelItems = MC.models;
        // Проходом по элементам MC определим, какие виды нужно срендерить
        for (var i = 0, j = modelItems.length; i < j; i++) {
            var view = this.getItemByModel(modelItems[i]);

            // если нет view, то это значит, что элемент коллекции был отфильтрован
            if (view) {
                cb(view);
            }
        }
    }
};

/**
 * Возвращает вид-элемент коллекции по соответствуещей модели.
 * @param {ns.Model} modelItem
 * @returns {?ns.View} Eсли нет view, то это значит, что элемент коллекции был отфильтрован.
 */
ns.ViewCollection.prototype.getItemByModel = function(modelItem) {
    var modelItemKey = modelItem.key;
    return this.__model2View[modelItemKey];
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
 * @param {ns.Model} modelItem Элемент коллекции, для которой был создан вид.
 * @returns {ns.View}
 * @private
 */
ns.ViewCollection.prototype._addView = function(id, params, modelItem) {
    var view = this._getView(id, params);
    if (!view) {
        view = ns.View.create(id, params);

        var viewKey = view.key;
        var modelKey = modelItem.key;

        this.views[viewKey] = view;
        this.__model2View[modelKey] = view;
        this.__view2ModelKey[viewKey] = modelKey;
    }

    return view;
};

/**
 *
 * @param {ns.View} view
 * @private
 */
ns.ViewCollection.prototype._deleteView = function(view) {
    var viewKey = view.key;
    var correspondingModelKey = this.__view2ModelKey[viewKey];

    delete this.views[viewKey];
    delete this.__model2View[correspondingModelKey];
    delete this.__view2ModelKey[viewKey];
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

ns.ViewCollection.prototype._getRequestViews = function(updated, layout, updateParams) {
    var pageLayout = layout.views;

    var syncState = this.__evaluateState();
    this.__registerInUpdate(syncState, updated);

    // для асинков не ходим вниз по layout совсем
    if (syncState) {
        //FIXME: копипаста из ns.View

        // ModelCollection
        var MC = this.models[this.info.modelCollectionId];

        // сохраняем активные элементы коллекции, чтобы потом удалить старые
        var activeItems = {};

        // Какие элементы коллекции рендерить, мы можем понять только по модели
        // Поэтому, полезем внутрь, только если в ней есть данные
        if (MC.isValid()) {

            var modelItems = MC.models;
            var infoViewId = this.info.split.intoLayouts;

            var itemsContainer = [];

            // Проходом по элементам MC определим, какие виды нужно срендерить
            for (var i = 0, j = modelItems.length; i < j; i++) {
                var modelItem = modelItems[i];
                var viewItemParams = no.extend({}, updateParams, modelItem.params);

                var viewItemLayout = infoViewId.call(this, modelItem, viewItemParams);

                if (!viewItemLayout) {
                    continue;
                }

                var newViewLayout = ns.layout.page(viewItemLayout, viewItemParams);
                itemsContainer.push(newViewLayout);

                // FIXME: нужен контроль потери детей. Удаление и чистка.
                // Создаем подблоки
                for (var view_id in newViewLayout) {
                    var newView = this._addView(view_id, viewItemParams, modelItem);
                    newView._getRequestViews(updated, newViewLayout[view_id], viewItemParams);

                    activeItems[newView.key] = null;
                }
            }

            pageLayout['ns-view-container'] = itemsContainer;

            // собираем неактивные виды, только когда создали реальное представление
            this.__collectInactiveViews(activeItems);

        } else {
            // ставим флаг, что у нас есть дети, но моделей нет, поэтому состояние неопределено
            updated.hasPatchLayout = true;
        }

    }

    // TODO: вроде бы ничего не мешает не переопределять этот метод и дать возможность коллекции иметь детей
    // Все элементы коллекции в контейнере, а коллекция может иметь собственную разметку, в т.ч. с другими видами

    this._saveLayout(pageLayout);

    // При необходимости добавим текущий вид в список "запрашиваемых"
    return updated;
};

/**
 * Собирает виды старые виды для уничтожения.
 * @param {object} activeItems
 * @private
 */
ns.ViewCollection.prototype.__collectInactiveViews = function(activeItems) {
    var that = this;
    this._apply(function(view) {
        // Если для view нет модели в MC, то нужно его прихлопнуть
        if (!(view.key in activeItems)) {
            // remove from collection
            that._deleteView(view);
            that.__itemsToRemove.push(view);
        }
    });

};

/**
 * Уничтожает старые виды.
 * @private
 */
ns.ViewCollection.prototype.__destroyInactiveViews = function() {
    var views = this.__itemsToRemove;
    for (var i = 0, j = views.length; i < j; i++) {
        views[i].destroy();
    }

    /*
     Почему важно очищать массив тут?

     Массив должен постоянно накапливать виды "на удаление",
     но удалять их не сразу, а вместе с общим обновлением DOM (#_updateHTML).
     Т.о. манипуляции с DOM будут происходит за один тик, а не будут размазаны по времени.

     Еще процесс обновления может прерваться, но вид должен остаться в массиве,
     чтобы его потом не забыть уничтожить.
     */
    this.__itemsToRemove = [];
};

/**
 *
 * @param {object} tree
 * @returns {ns.View~UpdateTree}
 * @private
 */
ns.ViewCollection.prototype._getUpdateTree = function(tree) {
    var decl;
    if (this.isValidSelf()) {
        decl = this._getPlaceholderTree();
    } else {
        decl = this._getViewTree();
    }

    // Добавим декларацию этого ViewCollection в общее дерево
    tree.views[this.id] = decl;

    return tree;
};

/**
 *
 * @returns {object.<string, ns.View~UpdateTree>}
 * @private
 */
ns.ViewCollection.prototype._getDescViewTree = function() {
    var result = {};
    result['ns-view-collection-container'] = [];

    var vcIsValidSelf = this.isValidSelf();

    this.forEachItem(function(view) {
        var decl = null;
        if (vcIsValidSelf) {
            // Если корневая нода не меняется, то перерендериваем
            // только невалидные элементы коллекции
            if (view.info.isCollection && view.isValidSelf()) {
                decl = view._getPlaceholderTree();
            } else if (!view.isValid()) {
                decl = view._getViewTree();
            } else if (!view.isValidWithDesc()) {
                var viewTree = {
                    views: {}
                };
                view._getUpdateTree(viewTree);

                result['ns-view-collection-container'].push(viewTree.views);
                return;
            }
        } else {
            // Если же мы решили перерендеривать корневую ноду, то придётся рендерить все
            // элементы коллекции. Невалидные - полностью, а валидные в виде placeholder'ов
            if (view.isValidSelf()) {
                // если view - обычный вид, то isValidSelf === isValid
                // если view - коллекция, то она проверит себя (isValidSelf) и сделаем дерево для детей
                decl = view._getPlaceholderTree();

            } else {
                decl = view._getViewTree();
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
    });

    return result;
};

/**
 *
 * @param {HTMLElement} node
 * @param {object} updateOptions
 * @param {object} events
 * @private
 */
ns.ViewCollection.prototype._updateHTML = function(node, updateOptions, events) {
    // Для VC нам всегда прийдёт новая нода
    var newNode = this._extractNode(node);
    var isOuterPlaceholder = $(newNode).hasClass('ns-view-placeholder');

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
            this.__onHide();
            this.__onHtmldestroy();
        }

        if ( this.isOk() ) {
            this._htmlinit(events['ns-view-htmlinit']);

        } else if (this.isLoading()) {
            // В асинхронном запросе вызываем async для view, которые являются заглушкой.
            events['ns-view-async'].push(this);
        }
    }

    if ( this.isOk() ) {
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
        var containerDesc = this.__getContainer();

        // Коллекции могут быть вложенны рекурсивно,
        // но плейсхолдер отрисуется только для самых верних,
        // поэтому на всякий случай поставляем сюда свою текущую ноду
        newNode = newNode || this.node;

        var prev;
        // Сначала сделаем добавление новых и обновление изменённых view
        // Порядок следования элементов в MC считаем эталонным и по нему строим элементы VC
        this.forEachItem(function(view) {
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
                view._updateHTML(newNode, options_next, events);

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

                var updateOptionsForPlaceholder = options_next;
                if (viewItemWasValid) {
                    // vc-item отрисовался как placeholder
                    // но внутри него могут быть невалидные виды, они должны сами себя заменить
                    updateOptionsForPlaceholder = no.extend({}, options_next);
                    updateOptionsForPlaceholder.toplevel = true;
                }

                // updateHTML надо пройти в любом случае,
                // чтобы у всех элементов коллекции сгенерились правильные события
                view._updateHTML(newNode, updateOptionsForPlaceholder, events);

                if (viewItemWasValid) {
                    // здесь не нужно перевешивать события, т.к. они могут быть повешены
                    // либо непосредственно на ноду, либо на document. В первом случае
                    // события переедут вместе со старой нодой, а во втором останутся там,
                    // где и были раньше
                    ns.replaceNode(view.node, view._extractNode(newNode));
                }
            }

            itemsExist[view.key] = view;

            prev = view;
        });
    }

    this.__destroyInactiveViews();

    if (!this.isLoading()) {
        // проверяет, что порядок видом соответствует порядку элементов коллекции
        // этот метод нужен для обработки изменения позиции элемента
        this.__sortViewItems();
    }
};

/**
 * Возвращает контейнер для элементов коллекции.
 * @private
 */
ns.ViewCollection.prototype.__getContainer = function() {
    // Контейнер потомков.
    var containerDesc;
    if (ns.hasClass(this.node, 'ns-view-container-desc')) {
        containerDesc = this.node;
    } else {
        containerDesc = ns.byClass('ns-view-container-desc', this.node)[0];
    }

    // Без него нельзя, т.к. если например при предыдущей отрисовке
    // ни один потомок не был отрендерен, а при текущей добавляются новые, непонятно,
    // в какое место их вставлять
    ns.assert(containerDesc, 'ns.ViewCollection', "Can't find descendants container (.ns-view-container-desc element) for '" + this.id + "'");

    return containerDesc;
};

ns.ViewCollection.prototype.__sortViewItems = function() {

    // Контейнер потомков.
    var containerDesc = this.__getContainer();

    // Итератор по HTMLCollection, который возвращает видимые ноды видов.
    var viewNodesIterator = ns.childrenIterator(containerDesc);

    this.forEachItem(function(view) {
        var cursorViewNode = viewNodesIterator.getNext();

        if (cursorViewNode !== view.node) {
            if (cursorViewNode) {
                containerDesc.insertBefore(view.node, cursorViewNode);
            } else {
                containerDesc.appendChild(view.node);
            }
        }
    });
};
