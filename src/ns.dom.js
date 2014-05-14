var ns = ns || require('./ns.js');

/**
 * Replaces oldNode with newNode
 * @param {Element} oldNode
 * @param {Element} newNode
 */
ns.replaceNode = function(oldNode, newNode) {
    oldNode.parentNode.replaceChild(newNode, oldNode);
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
