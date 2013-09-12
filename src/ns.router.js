/**
 * Find best page for url.
 * @param {string} url
 * @return {{ page: string, params: Object }}
*/
ns.router = function(url) {
    var baseDir = ns.router.baseDir;
    var routesDef = ns.router._routes;

    if ( url.indexOf(baseDir) !== 0) {
        // Ничего подходящего не нашли.
        return {
            page: ns.R.NOT_APP_URL,
            params: {},
            redirect: url
        };
    }

    // Откусываем префикс урла
    url = url.substring(baseDir.length);

    var urlChunks = url.split('?');
    // /path/?foo=bar -> /path/
    var urlWithoutQuery = urlChunks.shift();

    // we should check redirect without query
    if (urlWithoutQuery in routesDef.redirect) {
        return {
            page: ns.R.REDIRECT,
            params: {},
            // add baseDir for redirect url
            // so I define redirect "/" -> "/main", but real url is "/basepath/" -> "/basepath/main"
            redirect: baseDir + routesDef.redirect[urlWithoutQuery]
        };
    }

    if (urlWithoutQuery in routesDef.rewriteUrl) {
        var urlQuery = urlChunks.join('?');
        // rewrite url and add query
        url = routesDef.rewriteUrl[urlWithoutQuery] + (urlQuery ? '?' + urlQuery : '');
    }

    var routes = routesDef.route;
    for (var i = 0, j = routes.length; i < j; i++) {
        var route = routes[i];

        var r = route.regexp.exec(url);
        if (r) {
            var rparams = route.params;
            var params = {};

            // Вытаскиваем параметры из основной части урла.
            var l = rparams.length;
            var rparam;
            for (var k = 0; k < l; k++) {
                rparam = rparams[k];
                params[rparam.name] = r[k + 1] || rparam.default_value;
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
 * Inititialize ns.router, compiles defined routes.
 */
ns.router.init = function() {
    var routes = ns.router.routes;

    var _routes = {};
    _routes.redirect = routes.redirect || {};
    _routes.rewriteUrl = routes.rewriteUrl || {};
    _routes.rewriteParams = routes.rewriteParams || {};

    // FIXME вообще конечно лучше бы route был массивом, потому что нам важен порядок рутов... пока не трогаем )
    var rawRoutes = routes.route || {};

    var compiledRoutes = [];
    var compiledRoutesHash = {};
    for (var route in rawRoutes) {
        var page = rawRoutes[route];
        var compiled = ns.router.compile(route);
        compiled.page = page;
        compiledRoutes.push(compiled);
        compiledRoutesHash[page] = compiledRoutesHash[page] || [];
        compiledRoutesHash[page].push(compiled);
    }
    _routes.route = compiledRoutes;
    _routes.routeHash = compiledRoutesHash;

    ns.router._routes = _routes;

    // Типы нужны при генерации урла.
    ns.router._regexps = {};
    for (var id in ns.router.regexps) {
        ns.router._regexps[id] = new RegExp( ns.router.regexps[id] );
    }
};

/**
 * Generate url.
 * @param {string} url Relative url.
 * @return {String} Valid url that takes into consideration baseDir.
 */
ns.router.url = function(url) {
    return (ns.router.baseDir + url) || '/';
};

ns.router.generateUrl = function(id, params) {
    var url;
    var routes = ns.router._routes.routeHash[id];
    params = params || {};

    if (!routes || !routes.length) {
        throw new Error("[ns.router] Could not find route with id '" + id + "'!");
    }

    for (var i = 0; i < routes.length; i++) {
        url = ns.router._generateUrl(routes[i], params);
        if (url) {
            break;
        }
    }

    if (url === null) {
        throw new Error("[ns.router] Could not generate url for layout id '" + id + "'!");
    }

    return ns.router.url(url);
};

/**
 * @param {Object} def Url definition.
 * @param {Object} params Url generation params.
 * @return {?string} Generated url.
 */
ns.router._generateUrl = function(def, params) {
    var url;
    var part;
    var pvalue;
    var result = [];
    var query = no.extend({}, params);
    var rewrites = ns.router._routes.rewriteUrl;

    for (var i = 0; i < def.parts.length; i++) {
        part = def.parts[i];
        if (!part.name) {
            // Добавляем статический кусок урла как есть.
            result.push(part.default_value);
        } else {
            pvalue = params[part.name] || part.default_value;

            // Обязательный параметр должен быть указан.
            if (!part.is_optional && !pvalue) {
                return null;
            }

            // Опциональный параметр не должен попасть в урл, если он не указан явно в params.
            if (part.is_optional && !(part.name in params)) {
                continue;
            }

            // Проверка типа.
            if (!ns.router._regexps[part.type].test(pvalue)) {
                return null;
            }

            result.push(pvalue);
            delete query[part.name];
        }
    }

    url = result.join('/');
    url = (url) ? ('/' + url) : '';

    // Разворачиваем rewrite правила, чтобы получить красивый урл до rewrite-ов.
    var rewrote = true;
    while (rewrote) {
        rewrote = false;
        for (var srcUrl in rewrites) {
            if (url === rewrites[srcUrl]) {
                url = srcUrl;
                rewrote = true;
            }
        }
    }

    // Дописываем query string.
    var queryString = $.param(query);
    return (queryString) ? (url + '?' + queryString) : url;
};

/**
 * Compile route.
 * @param {String} route
 * @return {{ regexp: RegExp, tokens: Array.<string> }}
*/
ns.router.compile = function(route) {
    // Удаляем слеши в начале и в конце урла.
    route = route
        .replace(/^\//, '')
        .replace(/\/$/, '');

    var parts = route.split('/');
    var params = parts.map(ns.router._parseParam);
    var pregexps = params.map(ns.router._generateParamRegexp);
    var regexp = pregexps.join('');

    // Добавляем "якоря" ^ и $;
    // Плюс матчим необязательный query-string в конце урла, вида ?param1=value1&param2=value2...
    regexp = '^' + regexp + '\/?(?:\\?(.*))?$';

    return {
        regexp: new RegExp(regexp),
        params: params.filter(function(p) { return !!p.name; }), // оставляем только настоящие параметры, а не статические части урла
        parts: params // для генерации урла нужны все параметры
    };
};

ns.router._parseParam = function(param) {
    var param_extract;
    var type_parts;
    var default_parts;
    var param_type;
    var param_default;
    var param_is_optional;

    // Параметр (указывается в фигурных скобках)
    param_extract = /{([^}]+)}/.exec(param);
    if (param_extract) {
        // Самый сложный вариант: {name=default:type}
        param = param_extract[1];

        // parameter type (defaults to id)
        type_parts = param.split(':');
        param_type = type_parts[1] || 'id';

        // parameter default value and if parameter is optional
        param = type_parts[0];
        default_parts = param.split('=');
        param_default = default_parts[1];
        param_is_optional = (default_parts.length > 1);

        // section parsed
        param = default_parts[0];
        return {
            name: param,
            type: param_type,
            default_value: param_default,
            is_optional: param_is_optional
        };
    } else {
        // статический кусок урла
        return {
            default_value: param
        };
    }
};

ns.router._generateParamRegexp = function(p) {
    var re;
    var regexps = ns.router.regexps;

    // static text
    if (p.default_value && !p.name) {
        return '/' + p.default_value;
    }

    // validate parameter type is known (if specified)
    if (p.type && !(p.type in regexps)) {
        throw new Error("[ns.router] Could not find regexp for '" + p.type + "'!");
    }

    re = regexps[p.type];
    re = '/(' + re + ')';

    if (p.is_optional) {
        re = '(?:' + re + ')?';
    }

    return re;
};

/**
 * Базовая часть урла, относительно которой строятся урлы. Без слэша на конце.
 * @type {String}
 */
ns.router.baseDir = '';

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

if (window['mocha']) {

    ns.router.undefine = function() {
        ns.router._routes = null;
        ns.router.routes = {};
    };
}
