/*

    no.layout.define('app', {
        'app': {
            'head': true,
            '@left': {
                'folders': true,
                'labels': true
            },
            '@right': {}
        }
    });

    no.layout.define('messages', {
        'app @right': {
            'messages': true
        }
    }, 'app');

    no.layout.define('setup', {
        'app @left': {
            'setup-menu': true
        },
        'app @right': {
            'setup-{ .tab }': true
        },
        //  Или же через функцию, более явно.
        'app @right': function(params) {
            if (params.tab) {
                return {
                    'setup-{ .tab }': true
                };
            }

            return {
                'setup-index': true
            };
        },
        'app @right setup-{ .tab } @content': {
            'setup-menu': true
        }
    }, 'app');

*/

//  ---------------------------------------------------------------------------------------------------------------  //
//  no.layout
//  ---------------------------------------------------------------------------------------------------------------  //

(function() {

//  ---------------------------------------------------------------------------------------------------------------  //

no.layout = {};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Константы для модуля no.layout.

no.L = {};

no.L.VIEW = 'view';
no.L.BOX = 'box';
no.L.ASYNC = 'async';

//  ---------------------------------------------------------------------------------------------------------------  //

//  Хранилище "сырых" layout'ов.
var _pages = {};

//  Хранилище layout'ов для всех view.
var _views = {};

//  ---------------------------------------------------------------------------------------------------------------  //

no.layout.define = function(id, layout, parent_id) {
    _pages[id] = {
        layout: layout,
        parent_id: parent_id
    }
};

no.layout.page = function(id, params) {
    var raw = _pages[id];

    var layout = compile(raw.layout, params);

    if (raw.parent_id) {
        var parent = no.layout.page(raw.parent_id, params);

        layout = inherit(layout, parent);
    }

    extractViews(layout);

    return layout;
};

no.layout.view = function(id) {
    if (!id) {
        return _views;
    }

    return _views[id];
};

//  ---------------------------------------------------------------------------------------------------------------  //

function compile(layout, params) {
    var result = {};

    for (var raw_key in layout) {
        var key = no.jpath.string(raw_key)(params);

        var raw_value = layout[raw_key];
        var value;
        switch (typeof raw_value) {
            case 'function':
                value = compile( raw_value(params) );
                break;

            case 'object':
                value = compile(raw_value, params);
                break;

            default:
                value = raw_value;
        }

        result[key] = value;
    }

    return result;
}

function inherit(layout, parent) {
    var result = no.object.clone(parent);

    for (var key in layout) {
        var parts = key.split(/\s+/);
        var l = parts.length;

        if ( !isBox( parts[l - 1] ) ) {
            throw Error('Cannot overwrite view layout');
        }

        var lvalue = result;
        for (var i = 0; i < l - 1; i++) {
            lvalue = lvalue[ parts[i] ];
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
        if ( isBox(id) ) {
            continue;
        }

        if ( _views[id] ) {
            //  FIXME: Попытка переопределить лэйаут блока.
        }

        var value = layout[id];

        var r = {};
        for (var key in value) {
            if ( isBox(key) ) {
                r[key] = no.L.BOX;
            } else {
                var value2 = value[key];

                if (value2 === true || value2 === no.L.VIEW || typeof value2 === 'object') {
                    r[key] = no.L.VIEW;
                } else if (value2 === false || value2 === no.L.ASYNC) {
                    r[key] = no.L.ASYNC;
                } else {
                    // FIXME: Ошибка.
                }
            }

            extractViews(value2);
        }

        _views[id] = r;
    }
}

//  ---------------------------------------------------------------------------------------------------------------  //

function isBox(s) {
    return (s.substr(0, 1) === '@');
}

//  ---------------------------------------------------------------------------------------------------------------  //

})();

