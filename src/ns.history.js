/**
 * Объект для работы с историей и адресной строкой браузера.
 *
 * Методы:
 *
 * `ns.history.pushState(url)`
 *   Меняет URL в адресной строке, запоминая его в истории браузера.
 * `ns.history.replaceState(url)`
 *   Меняет URL в адресной строке, заменяя текущую запись в истории браузера.
 * `ns.history.legacy`
 *   {Boolean}
 *   Флаг использования HTML5 History API или отката на `hashchange`.
 */
ns.history = (function(window, ns) {

    var history = window.history;
    var location = window.location;

    var legacy = !(history.pushState && history.replaceState);

    // API для браузеров с поддержкой HTML5 History API.
    if (!legacy) {
        window.addEventListener('popstate', function(e) {
            // прибиваем событие, чтобы не дергалась адресная строка
            e.preventDefault();
            e.stopPropagation();

            ns.page.go();
        }, false);

        // Редирект с хешового урла на его полноценный аналог.
        if ((location.pathname + location.search).length === 1 && location.hash.length !== 0) {
            history.replaceState(null, 'mail', location.hash.substr(1));

            // Здесь `ns.page.go` можно не вызывать, потому что после `ns.init`
            // `ns.page.go` все равно вызывается.
        }

        return {
            pushState: history.pushState.bind(history, null, 'mail'),
            replaceState: history.replaceState.bind(history, null, 'mail'),
            legacy: false
        };

    // Откат на `hashchange`.
    } else {
        // Редирект с текущего полноценного урла на его хешовый аналог.
        if ((location.pathname + location.search).length > 1) {
            return location.replace('/#' + location.pathname + location.search);
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
                location.hash = url;
            },
            replaceState: function(url) {
                ignore = true;
                location.replace(location.pathname + location.search + '#' + url);
            },
            legacy: true
        };
    }

}(window, ns));
