//  ---------------------------------------------------------------------------------------------------------------  //
//  no.layout
//  ---------------------------------------------------------------------------------------------------------------  //

(function() {

//  ---------------------------------------------------------------------------------------------------------------  //

no.layout = {};

//  Хранилище layout'ов для всех страниц.
var pageLayouts = {};
//  Хранилище layout'ов для всех view.
var viewLayouts = {};

//  ---------------------------------------------------------------------------------------------------------------  //

no.layout.define = function(id, layout) {
    pageLayouts[id] = compileLayout(layout);
    extractViewLayouts('app', layout);
};

no.layout.page = function(id) {
    return pageLayouts[id];
};

no.layout.view = function(id) {
    return viewLayouts[id];
};

//  ---------------------------------------------------------------------------------------------------------------  //

function extractViewLayouts(id, layout) {
    //  Для боксов не нужно строить layout,
    //  кроме того, не нужно строить layout повторно.
    if ( !isBox(id) && !viewLayouts[id] ) {
        var r = {};

        if (typeof layout === 'object') {
            for (var key in layout) {
                r[ stripAt(key) ] = ( isBox(key) ) ? 'box' : 'view';
            }
        }

        viewLayouts[id] = r;
    }

    for (var key in layout) {
        extractViewLayouts( key, layout[key] );
    }
}

function compileLayout(layout) {
    if (typeof layout !== 'object') {
        return layout;
    }

    var tree = {};
    for (var key in layout) {
        tree[ stripAt(key) ] = compileLayout( layout[key] );
    }

    return tree;
};

//  ---------------------------------------------------------------------------------------------------------------  //

function isBox(s) {
    return (s.substr(0, 1) === '@');
}

function stripAt(s) {
    return ( isBox(s) ) ? s.substr(1) : s;
}

//  ---------------------------------------------------------------------------------------------------------------  //

})();

