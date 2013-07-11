/**
 * @fileOverview noscript dom helpers
 */


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
 * @param {String} html
 * @returns {Element}
 */
ns.html2node = function(html) {
    var div = document.createElement('div');
    div.innerHTML = html;

    return div.firstChild;
};

/**
 @param {string} className
 @param {Element} context
 @return {(Element|undefined)}
 */
//  FIXME: Мне не нравится использовать jQuery в noscript'е,
//  со временем я хочу выпилить jQuery совсем.
//  Пока что вот так странно.
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
