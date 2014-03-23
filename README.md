noscript
========
[![Build Status](https://travis-ci.org/yandex-ui/noscript.png?branch=master)](https://travis-ci.org/yandex-ui/noscript)
[![NPM version](https://badge.fury.io/js/noscript.png)](http://badge.fury.io/js/noscript)
[![Dependency Status](https://david-dm.org/yandex-ui/noscript.png)](https://david-dm.org/yandex-ui/noscript)

JS MVC framework

#### Changelog

##### Next
- `destroyWith` стал статическим методом `ns.Model.destroyWith`
- статический метод `ns.Model.isCollection` вместо метода самой модели
- новая функция `ns.assert` для проверки критичных условий и генерации ошибки, если условия не выполняются
- вначале вернул `_unbindModels` у view, потом понял, что с ним не работает invalidate view. Отключил unbind
- fix множественной подписки на ns-model-changed у view. Должно было стать пошустрее, но не очень заметно
- поправил баг в ns.requestManager: иногда для модели в состоянии ошибки ставился статус, что она ок
- добавил метод `ns.Model.prototype.needUpdateData(data)` чтобы можно было проверить, что пришли те же данные и не повышать версию модели (и не перерисоввывать view-хи)
- у события `ns-page-before-load` добавился третий параметр `newPageUrl` (теперь обработчик должен выглядеть так `onPageBeforeLoad: function(evt, pairOfPages, newPageUrl) { .. }`)
- фикс тестов про router (оказывается `it` отрабатывает асинхронно и тесты работали неправильно - добавил замыкание)

##### 0.1.11 (12.11.2013)
- Fix bug with bind/unbind global events

##### 0.1.10 (08.11.2013)
- Model destruction refactoring [#174](https://github.com/yandex-ui/noscript/pull/174). `ns.Model.find` renamed to `ns.Model.getValid`.
- Add method `ns.Model.prototype.select` which always returns array of results [#170](https://github.com/yandex-ui/noscript/issues/170)

##### 0.1.9 (22.10.2013)
- Drop History API support for old browsers. Use polyfill insted. [#171](https://github.com/yandex-ui/noscript/pull/171)

##### 0.1.8 (15.10.2013)
- `ns.router` decodes params from url [#168](https://github.com/yandex-ui/noscript/pull/168)
- `ns.Model.set` triggers `ns-model-changed` event first, then `ns-model-changed.<jpath>` [#165](https://github.com/yandex-ui/noscript/pull/165)

##### 0.1.7 (7.10.2013)
- New method `ns.router.generateUrl` [#154](https://github.com/yandex-ui/noscript/pull/154)

##### 0.1.5 (12.09.2013)
- Улучшение поведение `ns.Box` [#157](https://github.com/yandex-ui/noscript/pull/157)
- Добавлен метод `ns.router.generateUrl` для генерации урлов по параметрам [#154](https://github.com/yandex-ui/noscript/pull/157)

##### 0.1.3 (28.08.2013)
- Новый `ns.page.history` объект для манипуляций с историей приложения
- Исправлена проблема с конкурентными async-обновлениями.
- Исправлен баг в `ns.router` с реврайтом урлов с параметрами (например, `/page1?foo=bar`)
- У `ns.Model` появился метод `destroyWith` [#149](https://github.com/yandex-ui/noscript/pull/149)

##### 0.1.1
- Fix #146 `ns.action` поломал инициализацию наноблоков
- #129 Ошибка при setData для модели коллекции без split
- Merge pull request #131 from yandex-ui/collection-key
- Merge pull request #141 from yandex-ui/view-collection-async
- Merge pull request #139 from yandex-ui/view-collection-doc
- Merge pull request #143 from yandex-ui/ns-page-typo


##### 0.1.0
Более менее стабильная версия. Попытка начать версионировать процесс.

