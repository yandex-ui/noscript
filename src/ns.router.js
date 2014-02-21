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

    // empty url consider as app root ("/")
    if (!url) {
        url = '/';
    }

    var urlChunks = url.split('?');
    // /path/?foo=bar -> /path/
    var urlWithoutQuery = urlChunks.shift();

    var pathRedirect;
    routesDef.redirect.forEach(function(redirect) {
        if (redirect.regexp && redirect.regexp.test(urlWithoutQuery)) {
            pathRedirect = redirect.path;
        }
    });

    // we should check redirect without query
    if (pathRedirect) {
        return {
            page: ns.R.REDIRECT,
            params: {},
            // add baseDir for redirect url
            // so I define redirect "/" -> "/main", but real url is "/basepath/" -> "/basepath/main"
            redirect: baseDir + pathRedirect
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

                var paramValueFromURL = r[k + 1];
                if (paramValueFromURL) {
                    // try to decode
                    try {
                        paramValueFromURL = decodeURIComponent(paramValueFromURL);
                    } catch(e) {
                        // fallback to default value
                        paramValueFromURL = '';
                    }
                }

                if (!paramValueFromURL) {
                    paramValueFromURL = rparam.default_value;
                }

                params[rparam.name] = paramValueFromURL;
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

    var rawRedirects = routes.redirect || {};
    var rawRedirectsNew = [];
    for (var redirect in rawRedirects) {
        var compiled = ns.router.compile(redirect);
        rawRedirectsNew.push({
            regexp: compiled.regexp,
            path: rawRedirects[redirect]
        });
    }
    _routes.redirect = rawRedirectsNew;

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

/**
 * @param {string} id Page (layout) name.
 * @param {Object} params Url generation params.
 * @return {?string} Generated url.
 */
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

ns.router._generateUrl = function(def, params) {
    var url;
    var result = [];
    var query = no.extend({}, params);
    var rewrites = ns.router._routes.rewriteUrl;

    var section;
    var svalue;
    var pvalue;
    var param;

    for (var i = 0; i < def.sections.length; i++) {
        section = def.sections[i];
        svalue = '';

        for (var j = 0; j < section.items.length; j++) {
            param = section.items[j];

            if (!param.name) {
                // Добавляем статический кусок урла как есть.
                svalue += param.default_value;
            } else {
                var pvalue = params[param.name] || param.default_value;

                // Обязательный параметр должен быть указан.
                if (!param.is_optional && !pvalue) {
                    return null;
                }

                // Опциональный параметр не должен попасть в урл, если он не указан явно в params.
                if (param.is_optional && !(param.name in params)) {
                    continue;
                }

                // Проверка типа.
                if (!ns.router._regexps[param.type].test(pvalue)) {
                    return null;
                }

                svalue += pvalue;
                delete query[param.name];
            }
        }

        // Не добавляем пустую секцию, если она опциональна.
        if (!svalue && section.is_optional) {
            continue;
        }

        result.push(svalue);
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
    var sections = parts.map(ns.router._parseSection);
    var sregexps = sections.map(ns.router._generateSectionRegexp);
    var regexp = sregexps.join('');

    // Вычленяем только параметры.
    var params = [];
    sections.forEach(function(s) {
        params = params.concat(s.items.filter(function(p) { return !!p.name; }));
    });

    // Добавляем "якоря" ^ и $;
    // Плюс матчим необязательный query-string в конце урла, вида ?param1=value1&param2=value2...
    regexp = '^' + regexp + '\/?(?:\\?(.*))?$';

    return {
        regexp: new RegExp(regexp),
        params: params,
        sections: sections
    };
};

ns.router._parseSection = function(rawSection) {
    var curIndex = 0;
    var openBraketIndex = -1;
    var closeBraketIndex = -1;
    var items = [];

    while (true) {
        openBraketIndex = rawSection.indexOf('{', curIndex);
        if (openBraketIndex < 0) {
            break;
        }

        closeBraketIndex = rawSection.indexOf('}', openBraketIndex);
        if (closeBraketIndex < 0) {
            throw '[ns.router] could not parse parameter in url section: ' + rawSection;
        }

        // Добавляем всё, что до { как константу.
        if (openBraketIndex > curIndex) {
            items.push({
                default_value: rawSection.substr(curIndex, openBraketIndex - curIndex)
            });
        }

        // Дальше идёт переменная.
        items.push(ns.router._parseParam(rawSection.substr(openBraketIndex + 1, closeBraketIndex - openBraketIndex - 1)));

        curIndex = closeBraketIndex + 1;
    }

    // Добавляем оставшуюся часть секции .
    if (curIndex < rawSection.length) {
        items.push({
            default_value: rawSection.substr(curIndex)
        });
    }

    return {
        // Секция опциональна когда все параметры опциональны.
        is_optional: items.length && items.filter(function(p) { return p.is_optional; }).length === items.length,
        items: items
    };
};

/**
 * Парсит декларацию параметра (то, что внутри фигурных скобок.
 * Пример:
 *      name=default:type
 */
ns.router._parseParam = function(param) {
    var type_parts;
    var default_parts;
    var param_type;
    var param_default;
    var param_is_optional;

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
};

ns.router._generateSectionRegexp = function(section) {
    var re = '';

    section.items.forEach(function(p) {
        re += ns.router._generateParamRegexp(p);
    });

    if (section.is_optional) {
        re = '(?:/(?!/)' + re + ')?';
    } else {
        re = '/' + re;
    }

    return re;
};

ns.router._generateParamRegexp = function(p) {
    var re;
    var regexps = ns.router.regexps;

    // static text
    if (p.default_value && !p.name) {
        return p.default_value;
    }

    // validate parameter type is known (if specified)
    if (p.type && !(p.type in regexps)) {
        throw new Error("[ns.router] Could not find regexp for '" + p.type + "'!");
    }

    re = regexps[p.type];
    re = '(' + re + ')';

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
