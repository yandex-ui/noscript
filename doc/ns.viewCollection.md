# ns.ViewCollection

`ViewCollection` - это коллеция `ns.View`, привязанная к `ns.ModelCollection`.
При изменении коллекции позволяет перерисовывать только изменившиеся элементы.

По сути, образуется следующая зависимость один-к-одному:
```
ViewCollection      ->  ModelCollection
    view-item-1     ->      model-item-1
    view-item-2     ->      model-item-2
                    ...
    view-item-N     ->      model-item-N
```

`ns.ViewCollection` может зависит только от одной `ns.ModelCollection`.

`ns.ViewCollection` может содержать внутренние виды и иметь собственную html-разметку.

## Декларация

```js
ns.ViewCollection.define('my-view-collection', {
    models: [ 'my-model-collection' ],
    split: {
        view_id: 'my-view-collection-item'
    }
});
```

Декларация отличается добавлением опции `split.view_id`, которая определяет из каких `ns.View` состоит коллекция.

Декларация элемента `ns.ViewCollection` выглядит так:
```js
ns.View.define('my-view-collection-item', {
    models: [ 'my-model-collection-item' ]
});
```
Элемент коллекции ведет себя как обычный `ns.View` и ничего не знает про коллекцию.

Элементы коллекции помещаются в узел-контейнер, размеченный классом `ns-view-container-desc`.
Узел-контейнер **обязательно** должен быть указан. Вне этого контейнера можно делать собcтвенную html-разметку.
