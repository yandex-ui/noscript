# ns.ModelCollection

`ModelCollection` - это коллеция (по сути, массив) `ns.Model`.

Может иметь собственные данные.
Данные коллекции непосредственно не хранит, а собирает динамически из актуальных `ns.Model`.

Коллеция не может содержать одинаковых моделей.

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


