/**
 * Find best page for url.
 * @namespace
 * @param {string} url
 * @returns {ns.router~route}
 * @tutorial ns.router
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

    var pathRedirect = ns.router._processRedirect(routesDef.redirect, url);
    if (pathRedirect) {
        return {
            page: ns.R.REDIRECT,
            params: {},
            // add baseDir for redirect url
            // so I define redirect "/" -> "/main", but real url is "/basepath/" -> "/basepath/main"
            redirect: baseDir + pathRedirect
        };
    }

    var urlChunks = url.split('?');
    // /path/?foo=bar -> /path/
    var urlWithoutQuery = urlChunks.shift();

    if (urlWithoutQuery in routesDef.rewriteUrl) {
        var urlQuery = urlChunks.join('?');
        // rewrite url and add query
        url = routesDef.rewriteUrl[urlWithoutQuery] + (urlQuery ? '?' + urlQuery : '');
    }

    var routes = routesDef.route;
    for (var i = 0, j = routes.length; i < j; i++) {
        var route = routes[i];

        var params = ns.router._parseUrl(route, url);
        if (params) {
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
 * Энкодит значения параметров.
 * Доступно для переопределения в приложении.
 * @param {string} pValue значение параметра
 * @param {string} [pName] имя параметра
 */
ns.router.encodeParamValue = encodeURIComponent;
/**
 * Декодит значения параметров.
 * Доступно для переопределения в приложении.
 * @param {string} pValue значение параметра
 * @param {string} [pName] имя параметра
 */
ns.router.decodeParamValue = decodeURIComponent;

/**
 * Первый символ урла. Если приложение работает на хешах, то его надо переопределить в #.
 * @type {string}
 * @constant
 */
ns.router.URL_FIRST_SYMBOL = '/';

/**
 * Get params for router from url
 * @param {object} route Compiled route or redirect
 * @param {array} parsedChunks Result from RegExp.exec
 * @returns {object}
 * @private
 */
ns.router._getParamsRouteFromUrl = function(route, parsedChunks) {
    var rparams = route.params;

    var params = {};
    // Вытаскиваем параметры из основной части урла.
    var l = rparams.length;
    var rparam;
    for (var k = 0; k < l; k++) {
        rparam = rparams[k];

        var paramValueFromURL = parsedChunks[k + 1];
        if (paramValueFromURL) {
            // try to decode
            try {
                paramValueFromURL = ns.router.decodeParamValue(paramValueFromURL, rparam.name);
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
 * Парсит урл согласно маршруту.
 * @param {object} route Маршрут.
 * @param {string} url Обрабатываемый урл.
 * @returns {object|null} Разобранный объект с параметрами или null
 * @private
 */
ns.router._parseUrl = function(route, url) {
    var parsedChunks = route.regexp.exec(url);
    if (parsedChunks) {
        var params = ns.router._getParamsRouteFromUrl(route, parsedChunks);

        // Смотрим, есть ли дополнительные get-параметры, вида ?param1=value1&param2=value2...
        var query = parsedChunks[route.params.length + 1];
        if (query) {
            no.extend(params, ns.parseQuery(query));
        }

        return params;
    }

    return null;
};

/**
 * Обрабатывает стадию редиректов в маршрутизаторе.
 * @param {array} redirectDefs Массив редиректов.
 * @param {string} url Обрабатываемый урл.
 * @returns {string|null} Урл, куда надо средиректить, или null
 * @private
 */
ns.router._processRedirect = function(redirectDefs, url) {
    var pathRedirect;
    for (var i = 0, j = redirectDefs.length; i < j; i++) {
        var redirect = redirectDefs[i];

        // если обработчик редиректа - функция
        if (typeof redirect.path === 'function') {
            // парсим url
            var parsedParams = ns.router._parseUrl(redirect, url);
            if (parsedParams) {
                // отдаем в обработчик разобранные параметры и обрабатываемый url
                pathRedirect = redirect.path(parsedParams, url);
            }

        } else if (redirect.regexp.test(url)) {
            pathRedirect = redirect.path;
        }

        if (pathRedirect) {
            return pathRedirect;
        }
    }

    return null;
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
 * @returns {string} Valid url that takes into consideration baseDir.
 */
ns.router.url = function(url) {
    return (ns.router.baseDir + url) || '/';
};

/**
 * @param {string} id Page (layout) name.
 * @param {object} params Url generation params.
 * @returns {string} Generated url.
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

/**
 *
 * @param {object} def
 * @param {object} params
 * @returns {string}
 * @private
 */
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
                pvalue = params[param.name];
                var is_param_present = param.name in params;

                // Выставляем дефолтное значение только необязательным параметрам.
                if (param.is_optional && !is_param_present) {
                    pvalue = param.default_value;
                }

                // Если это фильтр, то проверяем точное совпадение.
                if (param.is_filter && pvalue !== param.filter_value) {
                    return null;
                }

                // Обязательный параметр должен быть указан.
                if (!param.is_optional && !is_param_present) {
                    return null;
                }

                // Опциональный параметр не должен попасть в урл, если он не указан явно в params.
                if (param.is_optional && !is_param_present) {
                    continue;
                }

                // Проверка типа.
                if (!ns.router._isParamValid(pvalue, param.type)) {
                    return null;
                }
                svalue += ns.router.encodeParamValue(pvalue, param.name);
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
    url = (url) ? (ns.router.URL_FIRST_SYMBOL + url) : '';

    // Разворачиваем rewrite правила, чтобы получить красивый урл до rewrite-ов.
    var rewrote = true;
    while (rewrote) {
        rewrote = false;
        for (var srcUrl in rewrites) {
            var rewriteTo = rewrites[srcUrl];
            var rewriteToLength = rewriteTo.length;
            var rewriteFrom = url.substr(0, rewriteToLength);

            // ищем не полное совпадение, а в начале строки,
            // например,
            // реврайт "/shortcut" -> "/page/1"
            // урл "/page/1/subpage/2" должен превратится в "/shortcut/subpage/2"
            if (rewriteFrom === rewriteTo) {
                var nextSymbol = url.charAt(rewriteToLength);
                // следующим за реврайченной строкой должен быть "/", "?" или ничего,
                // чтобы реврайт "/page/1" не реврайтил сгенеренный урл "/page/11"
                if (nextSymbol === '/' || nextSymbol === '?' || !nextSymbol) {
                    url = srcUrl + url.substr(rewriteTo.length);
                    rewrote = true;
                }
            }
        }
    }

    // Дописываем query string по traditional-схеме,
    // где массивы разворачиваются в ?id=1&id=2&id=3
    var queryString = ns.params2query(query);
    return (queryString) ? (url + '?' + queryString) : url;
};

/**
 * Compile route.
 * @param {string} route
 * @returns {object}
 */
ns.router.compile = function(route) {
    // Удаляем слеши в начале и в конце урла.
    route = route.replace(/\/$/, '');
    if (route[0] === ns.router.URL_FIRST_SYMBOL) {
        route = route.substr(1);
    }

    var parts = route.split('/');
    var sections = parts.map(ns.router._parseSection);
    var sregexps = sections.map(ns.router._generateSectionRegexp);

    // смысл это махинации - поставить правильный символ в начале урла
    // все секции генерятся с / в начале
    // поэтому заменяем первый символ на константу
    if (sregexps[0][0] === '/') {
        sregexps[0] = ns.router.URL_FIRST_SYMBOL + sregexps[0].substr(1);
    }
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

/**
 *
 * @param {string} rawSection
 * @returns {object}
 * @private
 */
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
 * @returns {object}
 * @private
 */
ns.router._parseParam = function(param) {
    var chunks;
    var param_type;
    var param_default;
    var param_is_optional;
    var param_filter_value;
    var param_is_filter = false;
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
        param_is_filter = true;
        param_filter_value = chunks[2];

        ns.assert(param_filter_value, 'ns.router', "Parameter '%s' value must be specified", paramName);
        ns.assert(ns.router._isParamValid(param_filter_value, param_type), 'ns.router', "Wrong value for '%s' parameter", paramName);

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
        is_optional: param_is_optional,
        is_filter: param_is_filter,
        filter_value: param_filter_value
    };
};

/**
 *
 * @param {object} section
 * @returns {string}
 * @private
 */
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

/**
 *
 * @param {object} p
 * @returns {RegExp}
 * @private
 */
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
    if (p.is_filter && p.filter_value) {
        re = '(' + p.filter_value + ')';

    } else {
        re = regexps[p.type];
        re = '(' + re + ')';

        if (p.is_optional) {
            re = '(?:' + re + ')?';
        }
    }

    return re;
};

/**
 *
 * @param {string} pvalue
 * @param {string} ptype
 * @returns {boolean}
 * @private
 */
ns.router._isParamValid = function(pvalue, ptype) {
    var _regexp = ns.router._regexps[ptype];
    ns.assert(_regexp, 'ns.router', "Could not find regexp for type '%s'!", ptype);
    return _regexp.test(pvalue);
};

/**
 * Устанавливает начальное состояние
 * @private
 */
ns.router._reset = function() {
    /**
     * Базовая часть урла, относительно которой строятся урлы. Без слэша на конце.
     * @type {string}
     */
    this.baseDir = '';

    /**
     * Скомпилированные данные.
     * @type {object}
     * @private
     */
    this._routes = null;

    /**
     * Маршруты.
     * Этот массив должен быть объявлен в проекте.
     * @type {object}
     */
    this.routes = {};

    /**
     * Регулярные выражения для проверки типов параметров.
     * @type {object}
     */
    this.regexps = {
        'id': '[A-Za-z_][A-Za-z0-9_-]*',
        'int': '[0-9]+'
    };
};

ns.router._reset();

/**
 * @typedef {object} ns.router~route
 * @property {string} page Название layout.
 * @property {object} params Параметры паршрута.
 */
