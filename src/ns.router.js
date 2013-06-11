/**
 * Find best page for url.
 * @param {string} url
 * @return {{ page: string, params: Object }|Boolean}
*/
ns.router = function(url) {
    var baseDir = ns.router.baseDir;
    var routesDef = ns.router._routes;

    if ( url.indexOf(baseDir) !== 0) {
        // Ничего подходящего не нашли.
        return {
            page: ns.R.NOT_FOUND,
            params: {}
        };
    }

    // Откусываем префикс урла
    url = url.substring(baseDir.length);

    if (url in routesDef.redirect) {
        ns.page.redirect(routesDef.redirect[url]);
        return false;
    }

    if (url in routesDef.rewriteUrl) {
        url = routesDef.rewriteUrl[url];
    }

    var routes = routesDef.route;
    for (var i = 0, j = routes.length; i < j; i++) {
        var route = routes[i];

        var r = route.regexp.exec(url);
        if (r) {
            var tokens = route.tokens;
            var defaults = route.defaults;
            var params = {};

            // Вытаскиваем параметры из основной части урла. Имена параметров берем из массива tokens.
            var l = tokens.length;
            for (var k = 0; k < l; k++) {
                params[ tokens[k] ] = r[ k + 1 ] || defaults[ tokens[k] ];
            }

            // Смотрим, есть ли дополнительные get-параметры, вида ?param1=value1&param2=value2...
            var query = r[l + 1];
            if (query) {
                no.extend( params, ns.parseQuery(query) );
            }

            // реврайты параметров для этой страницы
            if (route.page in routesDef.rewriteParams) {
                params = routesDef.rewriteParams[route.page](params);
            }

            return {
                page: route.page,
                params: params
            };
        }
    }

    // Ничего подходящего не нашли.
    return {
        page: ns.R.NOT_FOUND,
        params: {}
    };

};

/**
 * Generate url.
 * @param {string} url Relative url.
 * @return {String} Valid url that takes into consideration baseDir.
 */
ns.router.url = function(url) {
    return ns.router.baseDir + url;
};

/**
 * Inititialize ns.router, compiles defined routes.
 */
ns.router.init = function() {
    var routes = ns.router.routes;

    var _routes = {};
    _routes.redirect = routes.redirect || {};
    _routes.rewriteUrl = routes.rewriteUrl || {};
    _routes.rewriteParams = routes.rewriteParams || {};

    var rawRoutes = routes.route || {};

    var compiledRoutes = [];
    for (var route in rawRoutes) {
        var compiled = ns.router.compile(route);
        compiled.page = rawRoutes[route];
        compiledRoutes.push(compiled);
    }
    _routes.route = compiledRoutes;

    ns.router._routes = _routes;
    ns.router.baseDir = ns.router.baseDir || '';
};

/**
 * Compile route.
 * @param {String} route
 * @return {{ regexp: RegExp, tokens: Array.<string> }}
*/
ns.router.compile = function(route) {
    //  Отрезаем последний слэш, он ниже добавится как необязательный.
    var regexp = route.replace(/\/$/, '');

    var tokens = [];
    var defaults = {};

    //  Заменяем {name} на кусок регэкспа соответствующего типу токена name.
    //  Матч на слеш нужен, чтобы сделать слеш опциональным.
    regexp = regexp.replace(/(\/?){(.*?)}/g, function(_, slash, token) {
        var tokenParts = token.split(':');
        slash = slash || '';

        var type = tokenParts[1] || 'id';
        var rx_part = ns.router.regexps[type];
        if (!rx_part) {
            throw new Error("[ns.router] Can't find regexp for '" + type +"'!");
        }

        var tokenName = tokenParts[0];
        var equalSignIndex = tokenName.indexOf('=');

        if (equalSignIndex > 0) {
            var tokenDefault = tokenName.substring(equalSignIndex + 1);
            tokenName = tokenName.substring(0, equalSignIndex);

            tokens.push(tokenName);
            defaults[tokenName] = tokenDefault;
            if (slash) {
                return '(?:' + slash + '(' + rx_part + '))?';
            }
            else {
                return '(' + rx_part + ')?';
            }

        } else {
            //  Запоминаем имя токена, оно нужно при парсинге урлов.
            tokens.push(tokenName);
            return slash + '(' + rx_part + ')';
        }
    });
    //  Добавляем "якоря" ^ и $;
    //  Плюс матчим необязательный query-string в конце урла, вида ?param1=value1&param2=value2...
    regexp = '^' + regexp + '\/?(?:\\?(.*))?$';

    return {
        regexp: new RegExp(regexp),
        tokens: tokens,
        defaults: defaults
    };
};

/**
 * Базовая часть урла, относительно которой строятся урлы. Без слэша на конце.
 * @type {String}
 */
ns.router.baseDir = null;

/**
 * Скомпилированные данные.
 * @type {Object}
 * @private
 */
ns.router._routes = null;

/**
 * Маршруты.
 * Этот массив должен быть объявлен в проекте.
 * @type {Object}
 */
ns.router.routes = {};

/**
 * Регулярные выражения для проверки типов параметров.
 * @type {Object}
 */
ns.router.regexps = {
    'id': '[A-Za-z_][A-Za-z0-9_-]*',
    'int': '[0-9]+'
};
