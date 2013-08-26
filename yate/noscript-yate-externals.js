/**
 * Generate url according to router.
 * @param {string} path Relative url.
 * @return {string} Full url.
 */
yr.externals['ns-url'] = function(path) {
    return ns.router.url(path);
};
