# Шаблонизация ns.View в yate

За отрисовку `view` отвечает мода `ns-view`, она рисует как саму обвязку так и содержимое.
Не стоит переопределять эту моду без крайней необходимости.

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
