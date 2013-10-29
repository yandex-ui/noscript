# Шаблонизация ns.View в yate

## Создание View
За создание DOM-обертки и содержимого View  отвечает мода `ns-view`. Ее стоит использовать только для управления местом отрисовки дочерних View.
**Не стоит переопределять эту моду без крайней необходимости!**

Пример использования
```
match .my-view1 ns-view-content {
    <div class="view1-content">
        // в этом месте отрисуются все дочерние view
        apply /.views.* ns-view
    </div>
}

match .my-view2 ns-view-content {
    <div class="view2-content">
        <div class="view2-content__child">
            // в этом месте отрисуются дочерний view my-child1
            apply /.views.my-child1 ns-view
        </div>
        <div class="view2-content__child">
            // в этом месте отрисуются дочерний view my-child2
            apply /.views.my-child2 ns-view
        </div>
    </div>
}
```

## Атрибуты обертки View

* `ns-view-add-attrs` - с помощью этой моды можно дописать собственные атрибуты в DOM-обертку. Например,

```
match .my-view2 ns-view-add-attrs {
    @data-id = 'my-id'
}

```
* `ns-view-add-class` - с помощью этой моды можно дописать собственные классы в DOM-обертку. Например,

```
match .my-view2 ns-view-add-attrs {
    // пробел в начале обязателен
    " my-class"
}
```

## Содержимое View

`ns-view-content` - самая главная мода, отвечает за содержимое view при нормальной отрисовке.

```
match .my-view1 ns-view-content {
    <div class="view1-content">
        // в этом месте отрисуются все дочерние view
        apply /.views.* ns-view
    </div>
}
```

`ns-view-async-content` - мода отвечает за содержимое View в режиме async.
В большинстве случаев тут стоит рисовать лоадер пока грузятся данные.
В async-режиме у view не бывает дочерних элементов. Они появляются в нормальной отрисовке, когда используется `ns-view-content`

```
match .my-view1 ns-view-content {
    <div class="view1-content">
        <img src="loader.gif"/>
    </div>
}
```

## Элементы ViewСollection

В вопросе отрисовки коллеция не отличается от обычных View и рисуется теми же модами: `ns-view-content` и `ns-view-async-content`.
Для управления местом вставки элементов коллекции есть мода `ns-view-desc`.
Ее смысл в том, чтобы давать возможность ViewСollection иметь собственную обертку над элементами.

```
match .my-view-collection ns-view-content {
    <div class="my-view-collection__wrapper">
        <div class="my-view-collection__text">My View Collection</div>
        <div class="my-view-collection__items">
            // сюда будут отрисованы элементы коллекции
            apply . ns-view-desc
        </div>
    </div>
}
```

## Yate-хелперы

* `model('model-name')` - хелпер для быстрого получения данных модели. Внутри использует ключи, поэтому предпочтительнее jpath `/.models.model-name`
* `ns-generate-url` - external-функция для `ns.router.generateUrl`

## Структура JSON для отрисовки

```js
{
    async: false // boolean, view находится в async-режиме
    is_models_valid: true // boolean, флаг валидности моделей
    key: 'view=app' // string, ключ view
    models: { // object, объект с данными моделей
        model1: {} // данные модели1
        model2: {} // данные модели2
    },
    page: {} // object, параметры страницы, идентичен ns.page.current
    params: {} // object, параметры view
    views: {} // object, объект c дочерними view
}
```

