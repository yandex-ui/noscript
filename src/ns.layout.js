(function() {

    /**
     * Модуль "Раскладка страницы".
     * @tutorial ns.layout
     * @namespace
     */
    ns.layout = {};

    //  Хранилище "сырых" layout'ов.
    var _pages = {};

    var hasSpacesRE = /\s+/;

    /**
     * Определяет раскладку.
     * @param {string} id ID новой раскладки.
     * @param {object} layout Раскладка.
     * @param {string} [parent_id] ID родителя
     */
    ns.layout.define = function(id, layout, parent_id) {
        if ( _pages[id] ) {
            throw new Error("[ns.layout] Can't redefine '" + id + "'");
        }

        _pages[id] = {
            layout: layout,
            parent_id: parent_id
        };
    };

    /**
     * Устанавливает layout в начальное состояние
     */
    ns.layout._reset = function() {
        _pages = {};
    };

    /**
     * Возвращает раскладку страницы с заданным id и params.
     * @param {string} id ID раскладки
     * @param {object} [params] Параметры страницы.
     * @returns {object}
     */
    ns.layout.page = function(id, params) {
        var raw = _pages[id];
        if (!raw) {
            throw new Error("[ns.layout] '" + id + "' is not defined");
        }

        var layout = compile(raw.layout, params);

        if (raw.parent_id) {
            var parent = ns.layout.page(raw.parent_id, params);

            layout = inherit(layout, parent);
        }

        return layout;
    };

    /**
     * Компилирует layout в зависимости от параметров params.
     * Интерполируем ключи, раскрываем шоткаты, вычисляем функции и т.д.
     * @param {*} layout
     * @param {object} params
     * @returns {object}
     */
    function compile(layout, params) {
        var t = {};
        if (typeof layout === 'string') {
            //  Строка 'folders' является шоткатом для:
            //
            //  {
            //      'folders': true
            //  }
            //
            t[layout] = true;
            layout = t;

        } else if ( Array.isArray(layout) ) {
            //  Массив вида [ 'folders', 'labels' ] является шоткатом для:
            //
            //      {
            //          'folders': true,
            //          'labels': true
            //      }
            //
            //  Преобразуем массив в объект.
            for (var i = 0, l = layout.length; i < l; i++) {
                t[ layout[i] ] = true;
            }
            layout = t;

        }

        //  Рекурсивно компилируем значение каждого ключа и создаем новый объект result.
        var result = {};

        for (var raw_key in layout) {
            //  Ключ может быть с интерполяцией, так что вычисляем его.
            var key = no.jpath.string(raw_key)(params);

            var raw_value = layout[raw_key];
            var value;

            //  Интерпретируем значение, соответствующее ключу.
            switch (typeof raw_value) {
                //  Это функция, ее нужно вызвать и скомпилировать результат.
                case 'function':
                    value = compile( raw_value(params), params );
                    break;

                //  Это объект.
                case 'object':
                case 'string':
                    value = compile(raw_value, params);
                    break;

                default:
                    value = {};
            }

            result[cleanKey(key)] = {
                'type': getViewType(key),
                'views': value
            };
        }

        return result;
    }

    /**
     * Наследует layout от parent'а.
     * @param {object} layout
     * @param {object} parent
     * @returns {object}
     */
    function inherit(layout, parent) {
        var result = ns.object.clone(parent);

        for (var key in layout) {
            //  В ключе должен быть "путь" вида 'app left@ message content@'.
            var parts = key.split(hasSpacesRE);
            var l = parts.length;

            //  Путь должен заканчиваться на бокс.
            //  Т.е. на строку вида 'foo@'.
            //  Потому что можно переопределять только содержимое боксов.
            //  Изменять лэйаут блоков нельзя.
            if ( getViewType( parts[l - 1] ) !== ns.L.BOX ) {
                throw new Error("[ns.layout] Can't overwrite view layout '" + parts[l - 1] + "'");
            }

            var lvalue = result;
            for (var i = 0; i < l - 1; i++) {
                lvalue = lvalue[ cleanKey(parts[i]) ].views;
                if (!lvalue) {
                    throw new Error( '[no.layout] Path "' + parts.slice(0, i).join(' ') + '" is undefined in this layout and cannot be extended' );
                }
            }
            lvalue[ cleanKey(parts[l - 1]) ] = layout[key];
        }

        return result;
    }

    function getViewType(s) {
        var lastChar = s.substr(-1);
        if (lastChar === '@') {
            return ns.L.BOX;
        } else if (lastChar === '&') {
            return ns.L.ASYNC;
        }

        return ns.L.VIEW;
    }

    function cleanKey(key) {
        // если в ключе есть пробел, то это означает наследоание
        // в таких ключах не надо ничего вырезать
        if (hasSpacesRE.test(key)) {
            return key;
        }
        var ch = key.slice(-1);
        if (ch === '@' || ch === '&') {
            key = key.slice(0, -1);
        }
        return key;
    }

})();
