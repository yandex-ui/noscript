// ------------------------------------------------------------------------------------------------------------- //
// no.events
// ------------------------------------------------------------------------------------------------------------- //

//    Простейший pub/sub.
//
//    `no.Events` --- объект, который можно подмиксовать к любому другому объекту:
//
//        var foo = {};
//        no.extend( foo, no.Events );
//
//        foo.on('bar', function(e, data) {
//            console.log(e, data);
//        });
//
//        foo.trigger('bar', 42);
//
//    Или же:
//
//        function Foo() {}
//
//        no.extend( Foo.prototype, no.Events );
//
//        var foo = new Foo();
//
//        foo.on('bar', function(e, data) {
//            console.log(e, data);
//        });
//
//        foo.trigger('bar', 42);
//
//    Для общения с "космосом" есть специальный предопределенный объект `no.events`.
//    Через него нужно обмениваться сообщениями, не привязанными к какому-то конкретному инстансу объекта.
//
//        no.events.on('bar', function(e, data) {
//            console.log(e, data);
//        });
//
//        no.events.trigger('bar', 42);

no.Events = {};

// ------------------------------------------------------------------------------------------------------------- //

/**
    Тип для обработчиков событий.
    @typedef {function(string, *=)}
*/
no.Events.type_handler;

// ------------------------------------------------------------------------------------------------------------- //

/**
    Возвращает список обработчиков события name.
    Если еще ни одного обработчика не забинжено, возвращает (и сохраняет) пустой список.

    @param {string} name
    @return {Array.<no.Events.type_handler>}
*/
no.Events._getEventHandlers = function(name) {
    var handlers = this._eventHandlers || (( this._eventHandlers = {} ));

    return handlers[name] || (( handlers[name] = [] ));
};

// ------------------------------------------------------------------------------------------------------------- //

/**
    Подписываем обработчик handler на событие name.

    @param {string} name
    @param {no.Events.type_handler} handler
*/
no.Events.on = function(name, handler) {
    var handlers = this._getEventHandlers(name);

    handlers.push(handler);
};

/**
    Отписываем обработчик handler от события name.
    Если не передать handler, то удалятся вообще все обработчики события name.

    @param {string} name
    @param {no.Events.type_handler=} handler
*/
no.Events.off = function(name, handler) {
    if (handler) {
        var handlers = this._getEventHandlers(name);
        // Ищем этот хэндлер среди уже забинженных обработчиков этого события.
        var i = no.array.indexOf(handlers, handler);

        if (i !== -1) {
            // Нашли и удаляем этот обработчик.
            handlers.splice(i, 1);
        }
    } else {
        var handlers = this._eventHandlers;
        if (handlers) {
            // Удаляем всех обработчиков этого события.
            delete handlers[name];
        }
    }
};

// ------------------------------------------------------------------------------------------------------------- //

/**
    "Генерим" событие name. Т.е. вызываем по-очереди (в порядке подписки) все обработчики события name.
    В каждый передаем name и params.

    @param {string} name
    @param {*=} params
*/
no.Events.trigger = function(name, params) {
    // Копируем список хэндлеров.
    // Если вдруг внутри какого-то обработчика будет вызван `off()`, то мы не потеряем вызов следующего обработчика.
    var handlers = this._getEventHandlers(name).slice();

    for (var i = 0, l = handlers.length; i < l; i++) {
        handlers[i].call(this, name, params);
    }
};

// ------------------------------------------------------------------------------------------------------------- //

// Создаем "космос" --- дефолтный канал для обмена сообщениями.
no.events = no.extend( {}, no.Events );