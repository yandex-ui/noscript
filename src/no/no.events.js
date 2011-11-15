// ------------------------------------------------------------------------------------------------------------- //
// no.events
// ------------------------------------------------------------------------------------------------------------- //

no.events = {};

// ------------------------------------------------------------------------------------------------------------- //

/**
    Тип для обработчиков событий.
    @typedef {function(string, *=)}
*/
no.events.type_handler;

// ------------------------------------------------------------------------------------------------------------- //

/**
    Внутренний кэш обработчиков событий.
    @type {Object.<string, Array.<no.events.type_handler>>}
*/
no.events._handlers = {};

/**
    @type {number}
*/
no.events._hid = 1;

/**
    @type {string}
    @const
*/
no.events._expando = '__events' + (+new Date());

// ------------------------------------------------------------------------------------------------------------- //

/**
    Возвращает список обработчиков события name.
    Если еще ни одного обработчика не забинжено, возвращает (и сохраняет) пустой список.

    @param {string} name
    @return {Array.<no.events.type_handler>}
*/
no.events._get = function(name) {
    var handlers = no.events._handlers[name];
    if (!handlers) {
        handlers = no.events._handlers[name] = [];
    }
    return handlers;
};

// ------------------------------------------------------------------------------------------------------------- //

/**
    Подписываем обработчик handler на событие name.

    @param {string} name
    @param {no.events.type_handler} handler
*/
no.events.on = function(name, handler) {
    var handlers = no.events._get(name);

    var hid = handler[ no.events._expando ];
    if (!hid) {
        handler[ no.events._expando ] = no.events._hid++;
    } else {
        var i = no.array.firstMatch(handlers, function(handler) { // Ищем этот обработчик среди уже подписанных.
            return ( handler[ no.events._expando ] === hid );
        });
        if (i !== -1) { return; } // Этот обработчик уже подписан.
    }

    handlers.push(handler);
};

/**
    Отписываем обработчик handler от события name.
    Если не передать handler, то удалятся вообще все обработчики события name.

    @param {string} name
    @param {no.events.type_handler=} handler
*/
no.events.off = function(name, handler) {
    if (handler) {
        var hid = handler[ no.events._expando ];

        var handlers = no.events._get(name);
        var i = no.array.firstMatch(handlers, function(handler) { // Ищем этот хэндлер среди уже забинженных обработчиков этого события.
            return ( handler._hid === hid );
        });

        if (i !== -1) {
            handlers.splice(i, 1); // Нашли и удаляем этот обработчик.
        }
    } else {
        delete no.events._handlers[name]; // Удаляем всех обработчиков этого события.
    }
};

// ------------------------------------------------------------------------------------------------------------- //

/**
    "Генерим" событие name. Т.е. вызываем по-очереди (в порядке подписки) все обработчики события name.
    В каждый передаем name и params.

    @param {string} name
    @param {*=} params
*/
no.events.trigger = function(name, params) {
    var handlers = no.events._get(name).slice(); // Копируем список хэндлеров. Если вдруг внутри какого-то обработчика будет вызван off(),
                                                 // то мы не потеряем вызов следующего обработчика.
    for (var i = 0, l = handlers.length; i < l; i++) {
        handlers[i](name, params);
    }
};

