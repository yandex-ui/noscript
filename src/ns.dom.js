(function(ns) {

    /**
     * Replaces oldNode with newNode
     * @param {Element} oldNode
     * @param {Element} newNode
     * @returns {boolean}
     */
    ns.replaceNode = function(oldNode, newNode) {
        // такая вот защита от лишних действий
        if (oldNode === newNode) {
            return true;
        }

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
        if (!html) {
            return null;
        }

        var div = document.createElement('div');
        div.innerHTML = html;

        return div.firstChild;
    };

    /**
     * Возвращает итератор детям ноды.
     * @param {HTMLElement} node Нода-контейнер.
     * @param {boolean} doVisibleCheck Делать проверку на видимость (в понятии ns) вида.
     * @returns {{getNext: function}}
     */
    ns.childrenIterator = function(node, doVisibleCheck) {
        // Итератор по HTMLCollection, который возвращает видимые ноды видов.
        return (function(children) {
            var position = -1;
            var childrenCount = children.length;
            return {
                getNext: function() {
                    for (position += 1; position < childrenCount; position++) {
                        var child = children[position];
                        if (!doVisibleCheck || ns.hasClass(child, 'ns-view-visible')) {
                            return child;
                        }
                    }
                    return null;
                }
            };
        })(node.children);
    };

    var whiteSpacesInClassNameRE = /[\t\r\n]/g;

    /**
     * Checks if node has specified class.
     * @param {Element} node
     * @param {string} className
     * @returns {boolean}
     */
    if ((typeof document !== 'undefined') && document.createElement('div').classList) {

        ns.hasClass = function(node, className) {
            return node.classList.contains(className);
        };

    } else {

        ns.hasClass = function(node, className) {
            className = ' ' + className + ' ';
            return (node.nodeType === 1 && (' ' + node.className + ' ').replace(whiteSpacesInClassNameRE, ' ').indexOf(className) >= 0);
        };

    }

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

})(ns);
