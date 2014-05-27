/**
 * Generate url according to router.
 * @param {string} path Relative url.
 * @return {string} Full url.
 */
yr.externals['ns-url'] = function(path) {
    return ns.router.url(path);
};

yr.externals['ns-generate-url'] = function(id, params) {
    return ns.router.generateUrl(id, params);
};
