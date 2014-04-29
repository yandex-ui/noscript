[![Build Status](https://travis-ci.org/yandex-ui/noscript.png?branch=master)](https://travis-ci.org/yandex-ui/noscript)
[![NPM version](https://badge.fury.io/js/noscript.png)](http://badge.fury.io/js/noscript)
[![Dependency Status](https://david-dm.org/yandex-ui/noscript.png)](https://david-dm.org/yandex-ui/noscript)
# noscript - JS MVC framework

## Ключевые сущности

[Общее описание сущностей](/doc/entities.md)

[Инициализация и настройка фреймворка](/doc/ns.init.md)

[Документация в формате JSDoc](https://yandex-ui.github.io/noscript/)

### Раскладка страницы (ns.layout)

[Декларация](/doc/ns.layout.md)

### Маршрутизатор (ns.router)

[Описание](/doc/ns.router.md)

### Вид (ns.View)

[Декларация и принципы работы](/doc/ns.view.md)

[Структура шаблона](/doc/ns.view.yate.md)

[Вид-коллекция](/doc/ns.viewCollection.md)

### Модель (ns.Model)

[Описание](/doc/ns.model.md)

[Модель-коллекция](/doc/ns.modelCollection.md)

### Построение и обновление страницы (ns.Update)

[Логика работы](/doc/ns.update.logic.md)

## Best practice или примеры проектирования

[Модель состояний](/doc/patterns/ns.pattern.model.state.md)
[Поэтапная инициализация (дозагрузка) модели](/doc/patterns/ns.pattern.model.partial.md)

## Плагины

[noscript-bosphorus](https://github.com/yandex-ui/noscript-bosphorus). Реализует мост между yate и видом/моделями и позволяет вызывать их методы из шаблона.

[ns-rivets](https://github.com/Lapple/ns-rivets). Реализует data-binding в видах с помощью `rivets.js`.
