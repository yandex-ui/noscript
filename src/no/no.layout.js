no.layout = {};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @private
    @type { Object.<string, !Object> }
*/
no.layout._raw = {};

/**
    @private
    @type { Object.<string, !Object> }
*/
no.layout._compiled = {};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} id
    @param {!Object} layout
*/
no.layout.register = function(id, layout) {
    no.layout._raw[id] = layout;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
    @param {string} id
    @return {!Object}
*/
no.layout.get = function(id) {
    var compiled = no.layout._compiled[id];

    if (!compiled) {
        compiled = {};
        var raw = no.layout._raw[id];

        var parent_id = raw[ '..' ];
        if (parent_id) {
            var parent = no.layout.get( parent_id );
            no.extendRecursive( compiled, parent );
            delete raw[ '..' ];
        }

        for (var view_id in raw) {
            var boxes = compiled[ view_id ] || (( compiled[ view_id ] = {} ));

            var raw_boxes = raw[ view_id ];
            for (var box_id in raw_boxes) {
                boxes[ box_id ] = no.array( raw_boxes[ box_id ] );
            }
        }

        no.layout._compiled[id] = compiled;
    }

    return compiled;
};

// ----------------------------------------------------------------------------------------------------------------- //

