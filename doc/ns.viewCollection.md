# ns.ViewCollection

Коллеция `ns.View`, привязанная к `ns.ModelCollection`.
При изменении коллекции позволяет перерисовывать только изменившиеся элементы.

`ns.ViewCollection` может зависит только от одной `ns.ModelCollection` и не может содержать внутренних `ns.View`.

По сути, образуется следующая зависимость один-к-одному:
```
ViewCollection      ->  ModelCollection
    view-item-1     ->      model-item-1
    view-item-2     ->      model-item-2
                    ...
    view-item-N     ->      model-item-N
```

## Декларация

```js
ns.ViewCollection.define('my-view-collection', {
    models: [ 'my-model-collection' ],
    split: {
        view_id: 'my-view-collection-item'
    }
});
```

`ns.ViewCollection` наследуется от `ns.View`.
Декларация отличается добавлением опции `split.view_id`, которая определяет из каких `ns.View` состоит коллекция.

Декларация элемента `ns.ViewCollection` выглядит так:
```js
ns.View.define('my-view-collection-item', {
    models: [ 'my-model-collection-item' ]
});
```
Элемент коллекции ведет себя как обычный `ns.View` и ничего не знает про коллекцию.

