/**
 * Replaces oldNode with newNode
 * @param {Element} oldNode
 * @param {Element} newNode
 * @returns {boolean}
 */
ns.replaceNode = function(oldNode, newNode) {
    // если oldNode детачена из DOM, то у нее нет родителя
    if (oldNode.parentNode) {
        oldNode.parentNode.replaceChild(newNode, oldNode);
        return true;
    }

    return false;
};

/**
 * Removes node from DOM
 * @param {Element} node
 */
ns.removeNode = function(node) {
    var parent = node.parentNode;
    if (parent) {
        parent.removeChild(node);
    }
};

/**
 * Generates DOM from HTML-string.
 * @param {string} html
 * @returns {Element}
 */
ns.html2node = function(html) {
    var div = document.createElement('div');
    div.innerHTML = html;

    return div.firstChild;
};

/**
 * Полифил getElementsByClassName для IE8.
 * @function
 * @name ns.byClass
 * @param {string} className
 * @param {Element} context
 * @returns {Node[]}
 */
if ((typeof document !== 'undefined') && document.getElementsByClassName) {

    ns.byClass = function(className, context) {
        context = context || document;
        return context.getElementsByClassName(className);
    };

} else {

    ns.byClass = function(className, context) {
        context = context || document;
        return $(context).find('.' + className);
    };

}
