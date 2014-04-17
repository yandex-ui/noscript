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
            if (typeof redirect.path === 'function') {
                pathRedirect = redirect.path(ns.router._getParamsRouteFromUrl(url, redirect));
            } else {
                pathRedirect = redirect.path;
            }
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
            var params = ns.router._getParamsRouteFromUrl(url, route);

            // Смотрим, есть ли дополнительные get-параметры, вида ?param1=value1&param2=value2...
            var query = r[route.params.length + 1];
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
 * Get params for router from url
 * @param {string} url - current url
 * @param {Object} route - compiled route or redirect
 * @returns {{}}
 * @private
 */
ns.router._getParamsRouteFromUrl = function(url, route) {
    var r = route.regexp.exec(url);
    if (!r) {
        return {};
    }

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
    return params;
};

/**
 * Inititialize ns.router, compiles defined routes.
 */
ns.router.init = function() {
    var routes = ns.router.routes;

    // Типы параметров (нужны при валидации и при генерации урлов).
    ns.router._regexps = {};
    for (var id in ns.router.regexps) {
        ns.router._regexps[id] = new RegExp('^' + ns.router.regexps[id] + '$');
    }

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
    var compiledRedirects = [];
    for (var redirect in rawRedirects) {
        var compiled = ns.router.compile(redirect);
        compiledRedirects.push({
            regexp: compiled.regexp,
            path: rawRedirects[redirect],
            params: compiled.params
        });
    }
    _routes.redirect = compiledRedirects;

    ns.router._routes = _routes;
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

    ns.assert(routes && routes.length, 'ns.router', "Could not find route with id '%s'!", id);

    for (var i = 0; i < routes.length; i++) {
        url = ns.router._generateUrl(routes[i], params);
        if (url !== null) {
            break;
        }
    }

    ns.assert(url !== null, 'ns.router', "Could not generate url for layout id '%s'!", id);

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
                if (!ns.router._isParamValid(pvalue, param.type)) {
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

        result.push(encodeURIComponent(svalue));
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

        ns.assert(closeBraketIndex > 0, 'ns.router', 'could not parse parameter in url section: %s', rawSection);

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
 * Парсит декларацию параметра (то, что внутри фигурных скобок).
 * @returns {Object}
 * @private
 */
ns.router._parseParam = function(param) {
    var chunks;
    var param_type;
    var param_default;
    var param_is_optional;
    var paramName;

    chunks = param.split('=');
    // название и тип всегда идут вместе "paramName:paramType"
    var paramNameAndType = chunks[0].split(':');

    paramName = paramNameAndType[0];
    // если тип не указан, то id
    param_type = paramNameAndType[1] || 'id';

    // фильтр "=="
    if (chunks.length === 3) {
        param_is_optional = false;
        param_default = chunks[2];
        ns.assert(param_default, 'ns.router', "Parameter '%s' value must be specified", param);
        ns.assert(ns.router._isParamValid(param_default, param_type), 'ns.router', "Wrong value for '%s' parameter", param);

    } else {
        // если в декларации одно "=", то параметр опциональный
        param_is_optional = chunks.length === 2;
        param_default = chunks[1];
    }

    // section parsed
    return {
        name: paramName,
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
    if (p.type) {
        ns.assert((p.type in regexps), 'ns.router', "Could not find regexp for type '%s'!", p.type);
    }

    // parameter with filter (param==value)
    if (!p.is_optional && p.default_value) {
        re = '(' + p.default_value + ')';

    } else {
        re = regexps[p.type];
        re = '(' + re + ')';

        if (p.is_optional) {
            re = '(?:' + re + ')?';
        }
    }

    return re;
};

ns.router._isParamValid = function(pvalue, ptype) {
    var _regexp = ns.router._regexps[ptype];
    ns.assert(_regexp, 'ns.router', "Could not find regexp for type '%s'!", ptype);
    return _regexp.test(pvalue);
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
