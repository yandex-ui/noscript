# ns.History

В noscript для смены URL в адресной строке используется HTML5 History API, который не поддерживается [в IE раньше 10](http://caniuse.com/#feat=history).

## Polyfill для IE

В качестве полифилла можно использовать [devote/HTML5-History-API](https://github.com/devote/HTML5-History-API). Скрипт предоставляет стандартизированное API и будет использовать смену хеш-фрагмента URL для навигации.

    /notes/141 -> /#/notes/141

Кроме подключения самого скрипта на страницу нужно проделать небольшую работу:

1. Организовать редирект до старта приложения:

```js
// Тут может произойти смена URL и перезагрузка, поэтому какие-нибудь
// модели до редиректа запрашивать бессмысленно.
window.history.redirect();

ns.init();
```

2. Переопределить вычисление текущего URL приложения:

```js
var history = window.history;

if (history.emulate) {
    ns.page.getCurrentUrl = function() {
        return history.location.pathname + history.location.search;
    };
}
```
