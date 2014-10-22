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
        byModel: 'my-model-collection',
        intoViews: 'my-view-collection-item'
    }
});
```

Опция `split.intoViews` определяет из каких `ns.View` состоит коллекция.

Опция `split.byModel` определяет по какой модели коллекции строить виды.

Опция `models`, как и в ns.View определяет зависимость от моделей и подписки на их события.
По умолчанию ViewCollection делает следующие подписки:

 - обработчиком собственных событий `ns-model-changed` и `ns-model-destroyed` любых моделей устанавливается `invalidate`. Эти события наступают при изменении данных, по которым рисуется собственная html-разметка viewCollection'а, поэтому вид по умолчанию становится невалидным, чтобы перерисоваться.
 - обработчиком `ns-model-insert` и `ns-model-remove` модели-коллекции устанавливается `keepValid`. Эти события наступают при изменении состава модели-коллекции, по которой рисуются вложенные виды viewCollection'а. Собственная html-разметка при этом не затрагивается, поэтому вид по умолчанию остаётся валидным.
События моделей, вложенных в коллекцию игнорируются и подписаться на них через декларацию нельзя.


Декларация элемента `ns.ViewCollection` выглядит так:
```js
ns.View.define('my-view-collection-item', {
    models: [ 'my-model-collection-item' ]
});
```
Элемент коллекции ведет себя как обычный `ns.View` и ничего не знает про коллекцию.

Элементы коллекции помещаются в узел-контейнер, размеченный классом `ns-view-container-desc`.
Узел-контейнер **обязательно** должен быть указан. Вне этого контейнера можно делать собcтвенную html-разметку.

## Фильтрация и разнородная коллекция
Если для `split.intoViews` указать функцию вместо строки, то это даст как возможность фильтровать виды, так и составлять коллекцию из разных элементов.
Функция должна возвращать ID вида или `false`.

```js
ns.View.define('my-view-collection', {
    models: [ 'my-model-collection' ],
    split: {
        byModel: 'my-model-collection',
        intoViews: function(model) {
            // эти элементы мы фильтруем и не включаем в коллекцию
            if (model.get('.type') === 3) {
                return false;
            }
            
            if (model.get('.type') === 1) {
                // этот элемент станет видом 'view-item-type-1'
                return 'view-item-type-1';
            }
            
            // этот элемент станет видом 'view-item'
            return 'view-item';
        }
    }
});
```
