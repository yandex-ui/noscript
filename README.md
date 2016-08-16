[![Build Status](https://travis-ci.org/yandex-ui/noscript.svg?branch=master)](https://travis-ci.org/yandex-ui/noscript)
[![NPM version](https://badge.fury.io/js/noscript.svg)](http://badge.fury.io/js/noscript)
[![Dependency Status](https://david-dm.org/yandex-ui/noscript.svg)](https://david-dm.org/yandex-ui/noscript)
# noscript - JS MVC framework

## Документация

[Документация и best practice](https://yandex-ui.github.io/noscript/single-page/) | [JSDoc](https://yandex-ui.github.io/noscript/)

## Примеры
- [noscript-demo](https://github.com/yandex-ui/noscript-demo) - мини демо проект. Удобен для быстрых экспериментов с фреймворком и для проверки гипотез / демонстрации багов.

## Плагины

[noscript-bosphorus](https://github.com/yandex-ui/noscript-bosphorus). Реализует мост между yate и видом/моделями и позволяет вызывать их методы из шаблона.

[noscript-hash](https://github.com/doochik/noscript-hash). Заменяет History API на работу с хешами.

[noscript-view-edefine](https://github.com/doochik/noscript-view-edefine). Улучшает наследование видов.

[ns-rivets](https://github.com/Lapple/ns-rivets). Реализует data-binding в видах с помощью `rivets.js`.

[noscript-react](https://github.com/yandex-ui/noscript-react). Позволяет использовать React-компоненты в качестве View.

## Поддержка браузеров
 * Последние Chrome и Firefox
 * Opera 12+
 * IE9+. В `noscript` встроена поддержка History API, которого нет в IE9. Если нужна поддержка этого браузера, то стоит использовать полифилы, например, [history.js](https://github.com/browserstate/history.js) или перейти на работу с хешами через плагин `noscript-hash`.
