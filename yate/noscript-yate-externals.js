(function() {

var externals = yr.externals = yr.externals || {};

/**
 * Generate url according to router.
 * @param {string} path Relative url.
 * @return {string} Full url.
 */
externals.url = function(path) {
    return ns.router.url(path);
};

}());
