/**
 * Миксин, реализующий простейший pub/sub
 * @mixin
 * @example
 * var foo = {};
 * no.extend(foo, ns.Events);
 * foo.on('bar', function(e, data) {
 *   console.log(e, data);
 * });
 * foo.trigger('bar', 42);
 */
ns.Events = {};

/**
 * Подписывает обработчик handler на событие name.
 * @param {string} name Название события.
 * @param {function} handler Обработчик события.
 * @returns {ns.Events}
 */
ns.Events.on = function(name, handler) {
    var handlers = this._nsevents_handlers || (( this._nsevents_handlers = {} ));

    ( handlers[name] || (( handlers[name] = [] )) ).push(handler);

    return this;
};

/**
 * Подписывает обработчик handler на событие name, который испольняется только один раз.
 * @param {string} name Название события.
 * @param {function} handler Обработчик события.
 * @returns {ns.Events}
 */
ns.Events.once = function( name, handler ) {
    var that = this;
    var once = function() {
        that.off( name, once );
        handler.apply(this, arguments);
    };
    this.on( name, once );
    return this;
};

/**
 * Отписывает обработчик handler от события name.
 * Если не передать handler, то удалятся вообще все обработчики события name.
 * @param {string} name Название события.
 * @param {function} [handler] Обработчик события.
 * @returns {ns.Events}
 */
ns.Events.off = function(name, handler) {
    var handlers;
    if (handler) {
        handlers = this._nsevents_handlers && this._nsevents_handlers[name];
        if (handlers) {
            //  Ищем этот хэндлер среди уже забинженных обработчиков этого события.
            var i = handlers.indexOf(handler);

            if (i !== -1) {
                //  Нашли и удаляем этот обработчик.
                handlers.splice(i, 1);
            }
        }
    } else {
        handlers = this._nsevents_handlers;
        if (handlers) {
            //  Удаляем всех обработчиков этого события.
            handlers[name] = null;
        }
    }

    return this;
};

/**
 * "Генерим" событие name. Т.е. вызываем по-очереди (в порядке подписки) все обработчики события name.
 * В каждый передаем name и params.
 * @param {string} name
 * @param {...*} params
 * @returns {ns.Events}
 */
ns.Events.trigger = function(name, params) {
    /* jshint unused: false */
    var handlers = this._nsevents_handlers && this._nsevents_handlers[name];

    if (handlers) {
        //  Копируем список хэндлеров.
        //  Если вдруг внутри какого-то обработчика будет вызван `off()`,
        //  то мы не потеряем вызов следующего обработчика.
        handlers = handlers.slice();

        for (var i = 0, l = handlers.length; i < l; i++) {
            // оборачиваем обработчики в try-catch, чтобы не ломать очередь
            try {
                handlers[i].apply(this, arguments);
            } catch(e) {
                ns.log.exception('ns.events', e);
            }
        }
    }

    return this;
};

/**
 * "Генерим" событие в следующем тике.
 * @see ns.Events.trigger
 * @param {string} event
 * @param {...*} params
 */
ns.Events.atrigger = function(event, params) {
    /* jshint unused: false */
    var that = this;
    var args = arguments;
    no.next(function() {
        that.trigger.apply(that, args);
    });
};

/**
 * "Форвардим" все сообщения name в другой объект.
 * @param {string} name
 * @param {object} object
 * @returns {ns.Events}
 */
ns.Events.forward = function(name, object) {
    return this.on(name, function(e, params) {
        object.trigger(e, params);
    });
};

/**
 * Global events bus.
 * @mixes ns.Events
 */
ns.events = no.extend( {}, ns.Events );
