/**
 * Helper object for actions.
 */
no.Action = {};

no.Action._actions = {};

// ----------------------------------------------------------------------------------------------------------------- //

/**
 * Register action.
 * @param {string} id Action id.
 * @param {function} action Action to be performed.
 */
no.Action.register = function(id, action) {
    no.Action._actions[id] = action;
};

// ----------------------------------------------------------------------------------------------------------------- //

/**
 * @param {Node} node DOM node with @data-action attribute.
 */
no.Action.runFromNode = function(node) {
    var $node = $(node);
    var data = $node.data();
    var action = no.Action._actions[data.action];
    action(data.action, data.params, node);
};