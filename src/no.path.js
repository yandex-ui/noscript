// ------------------------------------------------------------------------------------------------------------- //
// no.Path
// ------------------------------------------------------------------------------------------------------------- //

/**
    @constructor
    @param {string} path    Строка, описывающая путь в объекте (нечто вроде xpath'а), например 'foo.bar[3]'.
*/
no.Path = function(path) {
    this.path = path;
};

no.Path._getters = {};
no.Path._setters = {};

// ------------------------------------------------------------------------------------------------------------- //

/**
    Функция-шоткат для методов объекта no.Path.

    Если value не передано, то возвращает значение, находящееся по пути path в объекте obj.

        var obj = {
            foo: {
                bar: [ 0, 1, 2, 3, 4 ]
            }
        };
        no.path('foo.bar', obj)     // [ 0, 1, 2, 3, 4 ]
        no.path('foo.bar[3]')       // 3
        no.path('foo.bar.baz')      // undefined

    Или же устанавливает по этому пути значение value, в этом случае возвращается старое значение.

        var obj = {};
        no.path('foo.bar', obj, 42) // undefined, в obj будет объект { foo: { bar: 42 } }.

    Но при этом, если теперь выполнить

        no.path('foo.bar[3]', obj, 24)

    то в obj.foo.bar будет все равно число 42, у которого будет свойство 3 со значением 24.

    Т.е. если по этому пути уже есть какой-нибудь объект (объект, строка, число, ...),
    то на его месте новый объект с другим типом создан не будет.

    Чтобы поменять тип, нужно явно выполнить что-нибудь типа:

        no.path('foo.bar', obj, []) или
        no.path('foo.bar', obj, null).

    @param {string} path
    @param {(Object|Array)} obj
    @param {*=} value
*/
no.path = function(path, obj, value) {
    var path = new no.Path(path);
    if (value !== undefined) {
        return path.set(obj, value);
    } else {
        return path.get(obj);
    }
};

// ------------------------------------------------------------------------------------------------------------- //

/**
    Возвращает значение, расположенное в объекте по соответствующему пути.
    Т.е. obj.foo.bar[3] или же undefined, если по такому пути ничего нет.
    При этом, даже если в obj.foo undefined, никакой ошибки не будет.

    @param {(Object|Array)} obj
*/
no.Path.prototype.get = function(obj) {
    var getter = this._getter;
    if (!getter) {
        getter = this._getter = no.Path._getter(this.path);
    }
    return getter(obj);
};

/**
    Устанавливает по соответствующему пути переданное в value значение.
    При этом будут созданы недостающие фрагменты пути, если нужно.

    @param {(Object|Array)} obj
    @param {*} value
*/
no.Path.prototype.set = function(obj, value) {
    var setter = this._setter;
    if (!setter) {
        setter = this._setter = no.Path._setter(this.path);
    }
    return setter(obj, value);
};

// ------------------------------------------------------------------------------------------------------------- //

/**
    Компилирует path в функцию-getter.

    @param {string} path
    @return {function( (Object|Array) )}
*/
no.Path._getter = function(path) {
    var compiled = no.Path._getters[path];

    if (!compiled) {
        var body = '';

        // Предположим, path = 'foo.bar[2]'
        // Разбиваем его на компоненты: [ 'foo', 'bar', 2 ].
        var parts = path.replace(/\]/g, '').split(/\.|\[/);
        if (!parts[0]) { parts.shift(); } // Если path начинается на [...], то parts[0] === ''.

        for (var i = 0, l = parts.length; i < l; i++) {
            var part = parts[i];

            var value = (/^[0-9]/.test(part)) ? 'obj[' + part + ']' : 'obj["' + part + '"]'; // Строка вида obj[3] или obj['foo'].
            body += 'obj = ' + value + '; if (obj == null) { return obj; }';
        }
        body += 'return obj;';

        compiled = no.Path._getters[path] = new Function('obj', body);
    }

    return compiled;
};

/**
    Компилирует path в функцию-setter.

    @param {string} path
    @return {function( (Object|Array), * )}
*/
no.Path._setter = function(path) {
    var compiled = no.Path._setters[path];

    if (!compiled) {
        var body = 'var obj_, l;';

        // Предположим, path = 'foo.bar[3]'
        // Разбиваем его на компоненты: [ 'foo', 'bar', 3 ].
        var parts = path.replace(/\]/g, '').split(/\.|\[/);
        if (!parts[0]) { parts.shift(); } // Если path начинается на [...], то parts[0] === ''.

        // Компоненты означают следующее:
        //      число:          индекс в массиве, например, [23].
        //      строка:         ключ в объекте, например ['foo'].
        //      пустая строка:  вставка в конец массива, например, [].

        var l = parts.length;
        for (var i = 1; i < l; i++) { // Обрабатываем все компоненты, кроме последней.
            var part = parts[i - 1];
            var next = parts[i];

            var value = getValue(part);
            var empty = (!next || /^[0-9]/.test(next)) ? '[]' : '{}';

            if (!part) { // Добавляем вычисление длинны текущего массива.
                body += 'l = obj.length;';
            }
            // Делаем шаг. Если получился null или undefined, создаем пустой объект или массив
            // (в зависимости от типа следующего шага).
            body += 'obj_ = ' + value + ';';
            body += 'obj = (obj_ == null) ? ' + value + ' = ' + empty + ' : obj_;';
        }
        // Последний компонент, собственно уже запись значения в объект, полученный выше.
        var part = parts[l - 1];
        var value = getValue(part);
        if (!part) {
            body += 'l = obj.length;';
        }
        body += 'var old = ' + value + ';'; // Сохраняем старое значение.
        body += value + ' = value;'; // Меняем значение.
        body += 'return old;'; // Возвращаем старое значение.

        compiled = no.Path._setters[path] = new Function('obj', 'value', body);
    }

    // Строка, представляющая доступ к объекту по ключу или к массиву по индексу.
    function getValue(part) {
        if (!part) { // Индекс не задан. Добавляем в конец массива.
            return 'obj[l]';
        }
        return (/^[0-9]/.test(part)) ? 'obj[' + part + ']' : 'obj["' + part + '"]'; // Строка вида obj[3] или obj['foo'].
    }

    return compiled;
};

