/**
 * Объект для работы с историей и адресной строкой браузера.
 *
 * Методы:
 *
 * `ns.history.pushState(url)`
 *   Меняет URL в адресной строке, запоминая его в истории браузера.
 * `ns.history.replaceState(url)`
 *   Меняет URL в адресной строке, заменяя текущую запись в истории браузера.
 * `ns.history.adapt()`
 *   Адаптирует хешовые URL для браузеров, поддерживающих HTML5 History API,
 *   выполняя трансформации типа `/#/message/123/` в `/message/123/`.
 * `ns.history.legacy`
 *   {Boolean}
 *   Флаг использования HTML5 History API или отката на `hashchange`.
 */
ns.history = (function(window, ns) {

    var history = window.history;
    var loc = window.location;

    var legacy = !(history.pushState && history.replaceState);

    // API для браузеров с поддержкой HTML5 History API.
    if (!legacy) {
        return {
            pushState: function(url, title) {
                history.pushState(null, title || ns.page.title(url), url);
            },
            replaceState: function(url, title) {
                history.replaceState(null, title || ns.page.title(url), url);
            },

            // Редирект с хешового урла на его полноценный аналог.
            adapt: function() {
                var hash = loc.hash.substr(1);

                // Если в хеше уже есть какие-то query параметры,
                // текущие надо к ним прибавить.
                var search = hash.indexOf('?') !== -1 ? loc.search.replace(/^\?/, '&') : loc.search;

                var hashRoute = ns.router(hash);
                var pathRoute = ns.router(loc.pathname);

                if (hash.length &&
                    hashRoute && hashRoute.page !== ns.R.NOT_FOUND &&

                    // TODO: При добавлении способа задания корневого урла заменить
                    // слеш на нужное свойство/метод.
                    (loc.pathname === '/' || pathRoute.page === ns.R.NOT_FOUND)) {
                    this.replaceState(hash + search);
                }

                window.addEventListener('popstate', function(e) {
                    // прибиваем событие, чтобы не дергалась адресная строка
                    e.preventDefault();
                    e.stopPropagation();

                    ns.page.go('', true);
                }, false);

                // Здесь `ns.page.go` можно не вызывать, потому что после `ns.init`
                // `ns.page.go` все равно вызывается.
            },
            legacy: false
        };

    // Откат на `hashchange`.
    } else {
        // Редирект с текущего полноценного урла на его хешовый аналог.
        //
        // TODO: При добавлении способа задания корневого урла заменить
        // слеш на нужное свойство/метод.
        if ((loc.pathname + loc.search) !== '/') {
            return loc.replace('/#' + loc.pathname + loc.search);
        }

        // Заставляет `hashchange` игнорировать смену URL через вызов legacy
        // `pushState` или `replaceState`.
        var ignore = false;

        window.addEventListener('hashchange', function() {
            if (!ignore) {
                ns.page.go();
            }

            ignore = false;
        }, false);

        return {
            pushState: function(url) {
                ignore = true;
                loc.hash = url;
            },
            replaceState: function(url) {
                ignore = true;
                loc.replace(loc.pathname + loc.search + '#' + url);
            },
            adapt: no.nop,
            legacy: true
        };
    }

}(window, ns));
