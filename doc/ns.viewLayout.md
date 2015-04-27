# Динамическое изменение детей у ns.View

Иногда бывают ситуации, когда возможностей менять раскладку страницы через ns.Box недостаточно.
Например, дети вида зависят от его состояния, моделей и того, что недоступно в layout.
Для решения этой проблемы создан метод `#patchLayout`.

## patchLayout для ns.View

```js
ns.layout.define('layout1', {
    'view-box@': {
        'view1': {
            'view2': {}
        }
    }
});

ns.layout.define('layout2', {
    'view-box@': {
        'view3': {
            'view4': {}
        }
    }
});

ns.View.define('view', {
    methods: {
        patchLayout: function(updateParams) {
            if (this.getModel('state').isGoodMoonPhase()) {
                return 'layout1';
            } else {
                return 'layout2';
            }
        }
    }
});
```

Описание и ограничение API `#patchLayout`:

 * метод вызывается только, если все модели валидны. Если это не так, то `ns.Update` запрашивает модели.
 * должен вернуть предопредленный `layoutID`, а не вид.
 * должен всегда возвращать `layoutID`, причем он должен начинаться с `box`. Это связано с проблемами из [#533](https://github.com/yandex-ui/noscript/issues/533).

## split.intoLayouts для ns.ViewCollection

API схоже с `ns.View#patchLyaout`. По сути `intoLayouts` позволяет иметь неограниченно сложные элементы коллекции.

Вместо `split.intoViews` коллекции объявляет `split.intoLayouts`,
где возвращает какую раскладку будет иметь каждый элемент коллекции.


```js
ns.layout.define('layout1', {
    'view-box@': {
        'view1': {
            'view2': {}
        }
    }
});

ns.layout.define('layout2', {
    'view-box@': {
        'view3': {
            'view4': {}
        }
    }
});

ns.ViewCollection.define('view-collection', {
    split: {
        byModel: 'model-collection'
        patchLayout: function(modelItem, viewItemParams) {
            if (modelItem.isGoodMoonPhase()) {
                return 'layout1';
            } else {
                return 'layout2';
            }
        }
    }
});
```

Описание и ограничение API `split.intoLayouts`:

 * метод вызывается только, если все модели валидны. Если это не так, то `ns.Update` запрашивает модели.
 * поведение идентично `split.intoViews`.
