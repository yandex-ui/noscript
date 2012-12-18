/**
 * Find best page for url.
 * @param {string} url
 * @return {{ page: string, params: Object }}|Boolean
*/
no.router = function(url) {

    var routes = no.router.routes;

    // Применяем поочередно все "реврайты", пока не найдем подходящий.
    for (var i = 0, j = routes.length; i < j; i++) {
        var route = routes[i];

        var r = route.regexp.exec(url);
        if (r) {
            if (route.redirect) {
                no.page.redirect(route.redirect);
                return false;
            }
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
    var redirectRegExp = /^->\s*(.*)/;
    var _routes = [];

    var routes = no.router.routes;
    for (var i = 0, l = routes.length; i < l; i += 2) {
        var compiled = no.router.compile( routes[i] );

        var page = routes[i + 1];
        var pageMatch = redirectRegExp.exec(page);
        if (pageMatch) {
            compiled.redirect = pageMatch[1];
        } else {
            compiled.page = page;
        }

        _routes.push( compiled );
    }

    no.router.routes = _routes;
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
 * Маршруты.
 * Этот массив должен быть объявлен в проекте.
 * @type {Array}
 */
no.router.routes = [];

/**
 * Регулярные выражения для проверки типов параметров.
 * @type {Object}
 */
no.router.regexps = {
    'id': '[A-Za-z_][A-Za-z0-9_-]*',
    'int': '[0-9]+'
};
