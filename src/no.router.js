/**
 * Find best page for url.
 * @param {string} url
 * @return {{ page: string, params: Object }|Boolean}
*/
no.router = function(url) {

    var routesDef = no.router._routes;

    if (url in routesDef.redirect) {
        no.page.redirect(routesDef.redirect[url]);
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
            var params = {};

            // Вытаскиваем параметры из основной части урла. Имена параметров берем из массива tokens.
            var l = tokens.length;
            for (var k = 0; k < l; k++) {
                params[ tokens[k] ] = r[ k + 1 ];
            }

            // Смотрим, есть ли дополнительные get-параметры, вида ?param1=value1&param2=value2...
            var query = r[l + 1];
            if (query) {
                no.extend( params, no.parseQuery(query) );
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
        page: 'not-found',
        params: {}
    };

};

/**
 * Inititialize no.router, compiles defined routes.
 */
no.router.init = function() {
    var routes = no.router.routes;

    var _routes = {};
    _routes.redirect = routes.redirect || {};
    _routes.rewriteUrl = routes.rewriteUrl || {};
    _routes.rewriteParams = routes.rewriteParams || {};

    var rawRoutes = routes.route || {};

    var compiledRoutes = [];
    for (var route in rawRoutes) {
        var compiled = no.router.compile(route);
        compiled.page = rawRoutes[route];
        compiledRoutes.push(compiled);
    }
    _routes.route = compiledRoutes;

    no.router._routes = _routes;
};

/**
 * Compile route.
 * @param {String} route
 * @return {{ regexp: RegExp, tokens: Array.<string> }}
*/
no.router.compile = function(route) {
    var regexp = route.replace(/\/$/, ''); // Отрезаем последний слэш, он ниже добавится как необязательный.

    var tokens = [];
    regexp = regexp.replace(/{(.*?)}/g, function(_, token) { // Заменяем {name} на кусок регэкспа соответствующего типу токена name.
        var tokenParts = token.split(':');

        var type = tokenParts[1] || 'id';
        var rx_part = no.router.regexps[type];
        if (!rx_part) {
            throw "Can't find regexp for '" + type +"'!";
        }
        tokens.push(tokenParts[0]); // Запоминаем имя токена, оно нужно при парсинге урлов.

        return '(' + rx_part + ')';
    });
    regexp = '^' + regexp + '\/?(?:\\?(.*))?$'; // Добавляем "якоря" ^ и $;
                                                // Плюс матчим необязательный query-string в конце урла, вида ?param1=value1&param2=value2...

    return {
        regexp: new RegExp(regexp),
        tokens: tokens
    };
};

/**
 * Скомпилированные данные.
 * @type {Object}
 * @private
 */
no.router._routes = null;

/**
 * Маршруты.
 * Этот массив должен быть объявлен в проекте.
 * @type {Object}
 */
no.router.routes = {};

/**
 * Регулярные выражения для проверки типов параметров.
 * @type {Object}
 */
no.router.regexps = {
    'id': '[A-Za-z_][A-Za-z0-9_-]*',
    'int': '[0-9]+'
};
