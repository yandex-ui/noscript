# ns.ModelCollection

`ModelCollection` - это коллеция (по сути, массив) `ns.Model`.

Может иметь собственные данные.
Данные коллекции непосредственно не хранит, а собирает динамически из актуальных `ns.Model`.

Коллеция может содержать разные модели.

`ns.ModelCollection` наследуется от `ns.Model` и добавляет к ней некоторые методы:
 - `#clear()` - очищает коллекцию
 - `#insert(models[, index = last])` - добавляет `models` в коллекцию на позицию `index`.
 - `#remove(models)` - удаляет `models` из коллекции.

При добавлении элементов бросает событие `ns-model-insert` со списком новых моделей.

При удалении элементов бросает событие `ns-model-remove` со списком удаленных моделей.

## Декларация

Декларация отличается наличием поля `split`

```js
ns.Model.define('my-model-collection', {
    split: {
        items: '.message',
        params: {
            'mid': '.mid'
        },
        model_id: 'message'
    }
});
```

`split.items` - jpath до элементов коллекции. После получения данных коллекции выберет элементы по этому jpath и сделает из каждого элемента модель. Это и будет коллекция.
`split.model_id` - название модели, из которых будет состоять коллекции
`split.params` - параметры для элементов коллекции

Если модель наполняется вручную, то `split` можно не указывать, а указать флаг `isCollection === true`.

Для таких колекций так же можно указать jpath, по которому будет лежать коллекция - `jpathItems` (по умолчанию, `.items`).

```js
ns.Model.define('my-model-collection', {
    isCollection: true,
    jpathItems: '.files'
});

ns.Model.define('my-model-item', {
    params: {
        id: null
    }
});

var collection = ns.Model.get('my-model-collection');
var collectionItem1 = ns.Model.get('my-model-item', {id : 1}).setData({'foo': 'bar'});
var collectionItem2 = ns.Model.get('my-model-item', {id : 2}).setData({'foo': 'baz'});

// добавляем элементы в коллекцию
collection.insert(collectionItem1);
collection.insert(collectionItem2);

// т.к. указан jpathItems, то данные коллекции будут выглядет вот так
{
    "files": [
        {
            "foo": "bar"
        },
        {
            "foo": "baz"
        }
    ]
}
```

## Фильтрация и разнородная коллекция
Если для `split.model_id` указать функцию вместо строки, то это даст как возможность фильтровать модели, так и составлять коллекцию из разных элементов.
Функция должна возвращать ID модели или `false`.

```js
ns.Model.define('my-model-collection', {
    split: {
        items: '.message',
        params: {
            'mid': '.mid'
        },
        model_id: function(modelItemData) {
            // эти элементы мы фильтруем и не включаем в коллекцию
            if (modelItemData.type === 3) {
                return false;
            }
            
            if (modelItemData.type === 1) {
                // эти элементы станут экземпляром модели 'model-item-type-1'
                return 'model-item-type-1';
            }
            
            // эти элементы станут экземпляром модели 'model-item'
            return 'model-item';
        }
    }
});
```
