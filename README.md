[![Build Status](https://travis-ci.org/yandex-ui/noscript.png?branch=master)](https://travis-ci.org/yandex-ui/noscript)
[![NPM version](https://badge.fury.io/js/noscript.png)](http://badge.fury.io/js/noscript)
[![Dependency Status](https://david-dm.org/yandex-ui/noscript.png)](https://david-dm.org/yandex-ui/noscript)
# noscript - JS MVC framework

## Документация

[Документация и best practice](https://yandex-ui.github.io/noscript/single-page/) | [JSDoc](https://yandex-ui.github.io/noscript/) 

## Плагины

[noscript-bosphorus](https://github.com/yandex-ui/noscript-bosphorus). Реализует мост между yate и видом/моделями и позволяет вызывать их методы из шаблона.

[noscript-hash](https://github.com/doochik/noscript-hash). Заменяет History API на работу с хешами.

[noscript-view-edefine](https://github.com/doochik/noscript-view-edefine). Улучшает наследование видов.

[ns-rivets](https://github.com/Lapple/ns-rivets). Реализует data-binding в видах с помощью `rivets.js`.

## Поддержка браузеров
 * Последние Chrome и Firefox
 * Opera 12+
 * IE9+. В `noscript` встроена поддержка History API, которого нет в IE9. Если нужна поддержка этого браузера, то стоит использовать полифилы, например, [history.js](https://github.com/browserstate/history.js) или перейти на работу с хешами через плагин `noscript-hash`.
