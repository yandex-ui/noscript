/**
 * Generate url according to router.
 * @param {string} path Relative url.
 * @return {string} Full url.
 */
yr.externals['ns-url'] = function(path) {
    return ns.router.url(path);
};

/**
 * Мост в JS для вызова метода вида
 * @private
 */
yr.externals['_ns-view-call'] = function(view, methodName, p1, p2, p3, p4, p5) {
    view = yr.nodeset2data(view);
    var result = view[methodName](p1, p2, p3, p4, p5);
    if (Array.isArray(result)) {
        return yr.array2nodeset(result);
    } else {
        return yr.object2nodeset(result);
    }
};
