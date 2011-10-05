/**
    @param {string} url
    @return {{ page: string, params: Object }}
*/
no.router = function(url) {

    var routes = no.router.routes;

    // Применяем поочередно все "реврайты", пока не найдем подходящий.
    for (var i = 0, l = routes.length; i < l; i++) {
        var route = routes[i];

        var r = route.regexp.exec(url);
        if (r) {
            var tokens = route.tokens;
            var params = {};

            // Вытаскиваем параметры из основной части урла. Имена параметров берем из массива tokens.
            var l = tokens.length;
            for (var i = 0; i < l; i++) {
                params[ tokens[i] ] = r[ i + 1 ];
            }

            // Смотрим, есть ли дополнительные get-параметры, вида ?param1=value1&param2=value2...
            var query = r[l + 1];
            if (query) {
                no.extends( params, no.parseQuery(query) );
            }

            return {
                page: route.page,
                params: params
            };
        }
    }

    // Ничего подходящего не нашли.
    return {
        page: '404',
        params: {}
    };

};

// ----------------------------------------------------------------------------------------------------------------- //

no.router.init = function() {
    var _routes = [];

    var routes = no.router.routes;
    for (var i = 0, l = routes.length; i < l; i += 2) {
        var compiled = no.router.compile( routes[i] );
        compiled.page = routes[i + 1];

        _routes.push( compiled );
    }

    no.router.routes = _routes;
};

/**
    @param {string} route
    @return {{ regexp: RegExp, tokens: Array.<string> }}
*/
no.router.compile = function(route) {
    var regexp = route.replace(/\/$/, ''); // Отрезаем последний слэш, он ниже добавится как необязательный.

    var tokens = [];
    regexp = regexp.replace(/{(.*?)}/g, function(_, token) { // Заменяем {name} на кусок регэкспа соответствующего типу токена name.
        var type = no.router.types[ token ] || 'id';
        var rx_part = no.router.regexps[ type ];
        tokens.push(token); // Запоминаем имя токена, оно нужно при парсинге урлов.

        return '(' + rx_part + ')';
    });
    regexp = '^' + regexp + '\/?(?:\\?(.*))?$'; // Добавляем "якоря" ^ и $;
                                                // Плюс матчим необязательный query-string в конце урла, вида ?param1=value1&param2=value2...

    return {
        regexp: new RegExp(regexp),
        tokens: tokens
    };
};

// ----------------------------------------------------------------------------------------------------------------- //

