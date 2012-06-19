(function() {

//  ---------------------------------------------------------------------------------------------------------------  //
//  no.action
//  ---------------------------------------------------------------------------------------------------------------  //

no.action = {};

//  ---------------------------------------------------------------------------------------------------------------  //

var _actions = {};

// ----------------------------------------------------------------------------------------------------------------- //

/**
 * Register action.
 * @param {string} id Action id.
 * @param {function} action Action to be performed.
 */
no.action.define = function(id, action) {
    _actions[id] = action;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
 * @param {Node} node DOM node with @data-action attribute.
 */
no.action.run = function(node) {
    var id = node.getAttribute('data-action');
    var action = _actions[id];
    if (action) {
        var paramString = node.getAttribute('data-params');
        //  FIXME: Не будет ли тут какого-то XSS?
        var params = ( paramString.substr(0, 1) === '{' ) ? eval( '(' + paramString + ')' ) : paramString;
        return action(id, params, node);
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

})();

