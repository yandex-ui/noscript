
//  ---------------------------------------------------------------------------------------------------------------  //
//  no.layout
//  ---------------------------------------------------------------------------------------------------------------  //

(function() {

//  ---------------------------------------------------------------------------------------------------------------  //

no.layout = {};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Хранилище "сырых" layout'ов.
var _pages = {};

//  Хранилище layout'ов для всех view.
var _views = {};

//  ---------------------------------------------------------------------------------------------------------------  //

no.layout.define = function(id, layout, parent_id) {
    if ( _pages[id] ) {
        throw Error('Cannot redefine layout of ' + id);
    }

    _pages[id] = {
        layout: layout,
        parent_id: parent_id
    }
};

/**
 * Возвращает layout страницы с заданным id и params.
 * @param {String} id
 * @param {Object} params
 * @return {Object}
 */
no.layout.page = function(id, params) {
    return cleanLayout( getLayout(id, params) );
};

//  Возвращает layout блока с заданным id.
//
no.layout.view = function(id) {
    return _views[id];
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Компилирует layout в зависимости от параметров params.
//  Интерполируем ключи, раскрываем шоткаты, вычисляем функции и т.д.
//
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

            case 'boolean':
                //  FIXME: Тут по идее может быть только true.
                value = raw_value;
        }

        result[key] = value;
    }

    return result;
}

//  Наследуем layout от parent'а.
//
function inherit(layout, parent) {
    var result = no.object.clone(parent);

    for (var key in layout) {
        //  В ключе должен быть "путь" вида 'app left@ message content@'.
        var parts = key.split(/\s+/);
        var l = parts.length;

        //  Путь должен заканчиваться на бокс.
        //  Т.е. на строку вида 'foo@'.
        //  Потому что можно переопределять только содержимое боксов.
        //  Изменять лэйаут блоков нельзя.
        if ( !isBox( parts[l - 1] ) ) {
            throw Error('Cannot overwrite view layout "' + parts[l - 1] + '"');
        }

        var lvalue = result;
        for (var i = 0; i < l - 1; i++) {
            lvalue = lvalue[ parts[i] ];
            if (!lvalue) {
                throw Error( 'Path "' + parts.slice(0, i).join(' ') + '" is undefined in this layout and cannot be extended' );
            }
        }
        lvalue[ parts[l - 1] ] = layout[key];
    }

    return result;
}

function extractViews(layout) {
    if (typeof layout !== 'object') {
        return;
    }

    for (var id in layout) {
        var value = layout[id];

        if ( !isBox(id) ) {
            var view = obj2layout(value);

            var oldView = _views[id];
            if (oldView) {
                var oldKey = layout2key(oldView);
                var key = layout2key(view);
                if (oldKey !== key) {
                    throw Error( 'Cannot redefine layout of ' + id + ' ( "' + oldKey + '" -> "' + key + '" )' );
                }
            }
            _views[id] = view;
        }

        extractViews(value);
    }

    function obj2layout(obj) {
        var layout = {};

        for (var key in obj) {
            var ch = key.slice(-1);
            if (ch === '@') {
                layout[ key.slice(0, -1) ] = no.L.BOX;
            } else if (ch === '&') {
                layout[ key.slice(0, -1) ] = no.L.ASYNC;
            } else {
                layout[ key ] = no.L.VIEW;
            }
        }

        return layout;
    }

    function layout2key(layout) {
        var r = [];
        var keys = Object.keys(layout).sort();

        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var value = layout[key];

            if (value === no.L.BOX) {
                key += '@';
            }
            r.push(key);
        }

        return r.join(' ');
    }
}

//  ---------------------------------------------------------------------------------------------------------------  //

function isBox(s) {
    return ( s.substr(-1) === '@' );
}

//  ---------------------------------------------------------------------------------------------------------------  //

/**
 * Достаем layout, компилируем его.
 * Если нужно, наследуемся от родителя.
 * @param {String} id
 * @param {Object} params
 * @return {Object}
 */
function getLayout(id, params) {
    var raw = _pages[id];

    var layout = compile(raw.layout, params);

    if (raw.parent_id) {
        var parent = getLayout(raw.parent_id, params);

        layout = inherit(layout, parent);
    }

    extractViews(layout);

    return layout;
}

//  Вычищаем из ключей @ и &.
function cleanLayout(layout) {
    var result = {};

    for (var key in layout) {
        var value = layout[key];

        var ch = key.slice(-1);
        if (ch === '@' || ch === '&') {
            key = key.slice(0, -1);
        }

        result[key] = cleanLayout(value);
    }

    return result;
}

})();

