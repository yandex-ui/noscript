# Тестирование

Для юнит-тестов мы используем:
 - [mocha](http://visionmedia.github.io/mocha/): test-runner
 - [chai](http://chaijs.com/api/bdd/): библиотека assert'ов
 - [sinon](http://sinonjs.org/docs): библиотека для создания spy, mock, FakeXHR и т.п.
 - [karma](https://github.com/karma-runner/karma): сервер запуска тестов

## Как это работает

karma работает по архитектуре клиент-сервер.
К karma подключаются различные клиенты (браузеры), в которых она гоняет тесты.

Результат выполнения тестов пишется в консоль.

Чтобы запустить karma надо сделать:
```sh
./node_modules/karma/bin/karma start
```

Чтобы запустить karma в режиме watch надо сделать:
```sh
./node_modules/karma/bin/karma start --single-run=false
```
Режим watch удобно использовать при разработке,
karma следит на файлами и тесты будут автоматически перезапускаться во всех клиентах при изменении.

При запуске karma пишет на каком порту она слушает клиенты. Чтобы запускать тесты в браузере, надо перейти на этот урл.
```
INFO [karma]: Karma v0.12.9 server started at http://localhost:9876/
INFO [launcher]: Starting browser PhantomJS
```

karma позволяет прозрачно использовать все средства отладки, такие как `console` и `debugger`.

Иногда для отладки удобно использовать специальную страницу `http://localhost:9876/debug.html`.

## Советы

1. sinon.sandbox. Чтобы не заботится об очищении sinon в afterEach, надо использовать `this.sinon`
```
this.sinon.spy(ns, 'log');
```

2. `desribe.only`, `xdescribe`
```
desribe.only('', function()) // запустить только этот test-suite
xdesсribe('', function()) // пропустить этот test-suite

it.only('', function()) // запустить только этот test
xit('', function()) // пропустить этот тест
```

3. [sinon-chai](http://chaijs.com/plugins/sinon-chai) - это мост для удобных assert'ов
```
// старая некрасивая запись
expect(ns.method.calledWith(arg1, arg2)).to.be.equal(true);

// новая красивая запись
expect(ns.method).to.have.been.calledWith(arg1, arg2);
```
