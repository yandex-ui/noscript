# Шаблонизация ns.View в yate

Каждый вид отрисовывается изолированно. Корнем является JSON-структура описанная ниже.

Исходя из сменя контекста для каждого вида, не стоит увлекаться созданием ключей и глобальных переменных в yate, т.к. они будут перевычислять для каждого вида.
Более правильным способом является вынос таких данных в external-функции.

## Создание View
За создание DOM-обертки и содержимого отвечает мода `ns-view`.
Ее стоит использовать только для управления местом отрисовки дочерних View.

**Не стоит переопределять эту моду без крайней необходимости!**

## Атрибуты обертки View

* `ns-view-add-attrs` - с помощью этой моды можно дописать собственные атрибуты в DOM-обертку. Например,

```
match .my-view2 ns-view-add-attrs {
    @data-id = 'my-id'
}

```
* `ns-view-add-class` - с помощью этой моды можно дописать собственные классы в DOM-обертку. Например,

```
match .my-view2 ns-view-add-class {
    // пробел в начале обязателен
    " my-class"
}
```

## Содержимое View

### ns-view-content и ns-view-desc
`ns-view-content` - самая главная мода, отвечает за содержимое view при нормальной отрисовке.

```
match .my-view1 ns-view-content {
    <div class="view1-content">
        // в этом месте отрисуются все дочерние view с помощью хелпера ns-view-desc
        apply . ns-view-desc
    </div>
}
```

Если надо расставить виды по разным местам:
```
match .my-view2 ns-view-content {
    <div class="view2-content">
        <div class="view2-content__child">
            // в этом месте отрисуются дочерний вид my-child1
            apply /.views.my-child1 ns-view
        </div>
        <div class="view2-content__child">
            // в этом месте отрисуются дочерний вид my-child2
            apply /.views.my-child2 ns-view
        </div>
    </div>
}
```

### ns-view-async-content

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

### ns-view-error-content
`ns-view-error-content` - мода отвечается за состояние, когда часть моделей не удалось получить или для них вернулась ошибка.

## Элементы ViewСollection

В вопросе отрисовки коллеция не отличается от обычных View и рисуется теми же модами: `ns-view-content` и `ns-view-async-content`.
Для управления местом вставки элементов коллекции есть мода `ns-view-collection`.
Ее смысл в том, чтобы давать возможность ViewСollection иметь собственную обертку над элементами.

Если вы используете эту моду, то родительскую ноду для элементов коллекции надо пометить специальных классом `ns-view-container-desc`

```
match .my-view-collection ns-view-content {
    <div class="my-view-collection__wrapper">
        <div class="my-view-collection__text">My View Collection</div>
        <div class="my-view-collection__items ns-view-container-desc">
            // сюда будут отрисованы элементы коллекции
            // не забывайте добавлять класс для родителя элементов коллекции
            apply . ns-view-collection
        </div>
    </div>
}
```

## Yate-хелперы

* `model('model-name')` - хелпер для быстрого получения данных модели. Внутри использует ключи, поэтому быстрее, чем jpath `/.models.model-name.model-name`
* `modelError('model-name')` - хелпер для получения ошибки модели. Внутри использует ключи, поэтому быстрее jpath `/.models.model-name.model-name`
* `ns-url` - external-функция для `ns.router.url`
* `ns-generate-url` - external-функция для `ns.router.generateUrl`

## Структура JSON для отрисовки

```js
{
    box: false,
    collection: false,
    key: 'view=app',
    models: {
        model1: {
            'model1': {},
            'status': 'ok'
        },
        model2: {
            'model2': {},
            'status': 'ok'
        },
        model3: {
            'model3': 'http_timeout',
            'status': 'error'
        }
    },
    params: {},
    state: 'ok',
    views: {}
}
```

**Публичные свойства**:
 - `key`: string. Ключ вида.
 - `params`: object. Собственные параметры вида.
 - `views`: object. Объект с дочерними видами, используется для дальнейшего наложения шаблонов через ns-view-content. Имеет следующий вид:
```
{
    "views": {
        "view1Name": view1Tree
        "view2Name": view2Tree
    }
}
```

**Приватные свойства**:
 - `box`: boolean. Флаг того, что это бокс.
 - `collection`: boolean. Флаг того, что это вид-коллекция.
 - `models`: object. Объект с данными моделей. Не предназначен для прямого использования. Для получения моделей всегда используйте yate-хелперы `model()` и `modelError()`.
 - `state`: Текущее состояние вида. ok/error/loading/placeholder
