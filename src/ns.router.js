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
 * Generate url.
 * @param {string} url Relative url.
 * @return {String} Valid url that takes into consideration baseDir.
 */
ns.router.url = function(url) {
    return (ns.router.baseDir + url) || '/';
};

ns.router.generateUrl = function(id, params) {
    params = params || {};

    var result = [];
    var _routeDef = ns.router._routes.routeHash[id];

    if (!_routeDef) {
        throw new Error("[ns.router] Could not find route with id '" + id  +"'!");
    }

    var _rpart;
    var pvalue;
    for (var i = 0; i < _routeDef.parts.length; i++) {
        _rpart = _routeDef.parts[i];
        if (!_rpart.name) {
            result.push(_rpart.default_value);
        } else {
            pvalue = params[_rpart.name] || _rpart.default_value;

            // Обязательный параметр должен быть указан.
            if (!_rpart.is_optional && !pvalue) {
                throw new Error("[ns.router] Parameter '" + _rpart.name + "' must be specified");
            }

            // Опциональный параметр не должен попасть в урл, если он не указан явно в params.
            if (_rpart.is_optional && !(_rpart.name in params)) {
                continue;
            }

            // Проверка типа.
            if (!ns.router._regexps[_rpart.type].test(pvalue)) {
                throw new Error("[ns.router] Parameter '" + _rpart.name + "' type must be '" + _rpart.type + "'");
            }

            result.push(pvalue);
        }
    }

    var _url = result.join('/');
    _url = _url ? ('/' + _url) : '';
    return ns.router.url(_url);
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
    var compiledRoutesHash = {};
    for (var route in rawRoutes) {
        var compiled = ns.router.compile(route);
        compiled.page = rawRoutes[route];
        compiledRoutes.push(compiled);
        compiledRoutesHash[ rawRoutes[route] ] = compiled;
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
 * Compile route.
 * @param {String} route
 * @return {{ regexp: RegExp, tokens: Array.<string> }}
*/
ns.router.compile = function(route) {
    //  /a/b/ -> a/b
    route = route
        .replace(/^\//, '')
        .replace(/\/$/, '');

    var parts = route.split('/');
    var params = parts.map(ns.router.__parseParam);
    var pregexps = params.map(ns.router.__generateParamRegexp);
    var regexp = pregexps.join('');

    //  Добавляем "якоря" ^ и $;
    //  Плюс матчим необязательный query-string в конце урла, вида ?param1=value1&param2=value2...
    regexp = '^' + regexp + '\/?(?:\\?(.*))?$';

    return {
        regexp: new RegExp(regexp),
        params: params.filter(function(p) { return !!p.name; }), // оставляем только настоящие параметры, а не статические части урла
        parts: params // для генерации урла нужны все параметры
    };
};

ns.router.__parseParam = function(param) {
    var param_extract;
    var type_parts;
    var default_parts;
    var param_type;
    var param_default;
    var param_is_optional;

    // it can be a parameter (in curly braces)
    // the most complex case: name=default:type
    param_extract = /{([^}]+)}/.exec(param);
    if (param_extract) {
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
    }
    // it can be a static text
    else {
        return {
            default_value: param
        };
    }
};

ns.router.__generateParamRegexp = function(p) {
    var re;
    var regexps = ns.router.regexps;

    // static text
    if (p.default_value && !p.name) {
        return '/' + p.default_value;
    }

    // validate parameter type is known (if specified)
    if (p.type && !(p.type in regexps)) {
        throw new Error("[ns.router] Could not find regexp for '" + p.type +"'!");
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
