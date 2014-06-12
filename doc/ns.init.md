## Инициализация приложения

При использовании конфигурации по умолчанию вся инициализация сводится к вызову
функции `ns.init` и запуску первого апдейта:

```js
$(function() {
    ns.init();
    ns.page.go();
});
```

`ns.init` включает экшены, обрабатывает предварительно заданный роутинг и ищет
в DOM ноду `#app` для использования ее в качестве контейнера для интерфейса.
Вызов `ns.page.go` нужен для запуска первого глобального апдейта.

### Конфигурация

#### Базовый путь в URL

До инициализации можно задать префиксный путь для всех ссылок. Это может
пригодиться, когда ваше приложение находится не по корневому пути
`app.example.com`, а, например, `app.example.com/checkout`:

```js
ns.router.baseDir = '/checkout';
```

#### Заголовок страницы

Noscript позволяет задавать заголовок страницы, зависящий от текущего URL,
при переходах внутри приложения. Переопределите функцию `ns.page.title`:

```js
ns.page.title = function(url) {
    if ('/settings' == url) {
        return 'App - Account Settings'
    }

    return 'App';
};
```

*Примечание*: При необходимости, для получения параметров страницы
из полученного URL можно воспользоваться функцией `ns.router`:

```js
ns.page.title = function(url) {
    var params = ns.router(url).params;
    // ...
};
```

#### URL запроса моделей

По умолчанию фреймворк группирует запросы моделей, нужных для отрисовки
интерфейса и запрашивает их по URL `/models/` *вне зависимости
от `ns.router.baseDir`*. Переопределите константу `ns.request.URL` для задания
собственного пути:

```js
ns.request.URL = '/models/v1/json/';
```

#### Дополнительные параметры при запросе моделей

При необходимости пробросить дополнительные параметры при запросе моделей,
добавьте их в объект `ns.request.requestParams`:

```js
ns.request.requestParams.token = getAuthToken();
ns.request.requestParams.version = '0.1.1';
```

Это приведет к отправке запросов вида:

```
Request URL: http://example.com/models/?_m=todos

Query String Parameters:
  _m: todos

Form Data:
  category.0: home
  token: 6a5e516725c68c
  version: 0.1.1
```

#### Условная обработка ответа моделей

Определение функции `ns.request.canProcessResponse` позволяет динамически
заблокировать обработку ответа моделей, например, при несовпадении авторизации
или рассинхронизации клиента с бекендом:

```js
ns.request.canProcessResponse = function(response) {
    // На бекенде выехала новая версия, а текущий клиент засиделся.
    if (response.version != APP.version) {
        location.reload();
        return false;
    }

    return true;
};
```

#### Переопределение модуля Yate-шаблонов

По умолчанию для генерации разметки из шаблонов используется модуль `main`,
однако сохраняется возможность его динамического определения в зависимости от
параметров страницы и текущего лейаута:

```js
ns.Update.prototype.applyTemplate = function(tree, params, layout) {
    var module = 'main';

    if (params.context === 'setup') {
        module = 'setup';
    }

    return ns.renderString(tree, null, module);
};
```
