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
            no.extends( compiled, parent );

            delete raw[ '..' ];
        }

        for (var key in raw) {
            var value = raw[key];
            if (value) {
                compiled[key] = no.array(value);
            }
        }

        no.layout._compiled[id] = compiled;
    }

    return compiled;
};

// ----------------------------------------------------------------------------------------------------------------- //

