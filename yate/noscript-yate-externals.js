/**
 * Мост к ns.router.url
 * @param {string} path Урл.
 * @returns {string}
 */
yr.externals['ns-url'] = function(path) {
    return ns.router.url(path);
};

/**
 * Мост к ns.router.generateUrl.
 * @param {string} id Название layout.
 * @param {object} params Параметры для урла.
 * @returns {string}
 */
yr.externals['ns-generate-url'] = function(id, params) {
    return ns.router.generateUrl(id, params);
};
