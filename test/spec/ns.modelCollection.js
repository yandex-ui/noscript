describe('ns.ModelCollection', function() {

    beforeEach(function() {
        var methodCallback = this.methodCallback = this.sinon.spy();
        var methodNameCallback = this.methodNameCallback = this.sinon.spy();
        var changedCallback = this.changedCallback = this.sinon.spy();
        var insertCallback = this.insertCallback = this.sinon.spy();
        var removeCallback = this.removeCallback = this.sinon.spy();

        ns.Model.define('mc0', {
            params: {
                id: null
            },

            split: {
                items: '.item',
                params: {
                    id: '.id',
                    foo: '.value'
                },
                model_id: 'split1-item'
            },

            events: {
                'event1': 'onEvent1',
                'event2': function() {
                    methodCallback();
                },
                'ns-model-changed': changedCallback,
                'ns-model-insert': insertCallback,
                'ns-model-remove': removeCallback
            },

            methods: {
                onEvent1: function ev1() {
                    methodNameCallback();
                }
            }
        });

        ns.Model.define('split1-item', {
            params: {
                id: null,
                foo: null
            }
        });

        ns.Model.define('mc1', {
            params: {
                id: null
            },
            isCollection: true,
            jpathItems: '.jpathItems'
        });

        ns.Model.define('mc2', {
            params: {
                id: null
            },
            isCollection: true
        });
    });

    afterEach(function() {
        delete this.methodCallback;
        delete this.methodNameCallback;
        delete this.changedCallback;
        delete this.insertCallback;
        delete this.removeCallback;
    });

    describe('prototype', function() {

        describe('bindModel', function() {

            beforeEach(function() {
                ns.Model.define('someCollection', {
                    isCollection: true
                });
                ns.Model.define('someModel');

                var collection = ns.Model.get('someCollection').setData({foo: 'bar'});
                var someModel = ns.Model.get('someModel').setData({foo: 'bar'});
                this.callbackEvent0 = sinon.spy();

                collection.bindModel(someModel, 'event0', this.callbackEvent0);

                someModel.trigger('event0');
                someModel.trigger('event0');
                someModel.trigger('event1');

                collection.unbindModel(someModel, 'event0', this.callbackEvent0);

                someModel.trigger('event0');
            });

            it('should run callback only when was binded', function() {
                expect(this.callbackEvent0.calledTwice).to.be.ok;
            });

        });

        describe('setData', function() {

            beforeEach(function() {
                this.data = JSON.parse(JSON.stringify(ns.Model.TESTDATA.split1));
                this.newData = JSON.parse(JSON.stringify(ns.Model.TESTDATA.split2));

                this.model = ns.Model.get('mc0', { id: Math.random() });

                this.model.setData(this.data, { silent: true });

                this.models = this.model.models;

                this.modelCollection = ns.Model.get('mc1', { id: Math.random() });
            });

            afterEach(function() {
                delete this.data;
                delete this.model;
                delete this.models;
                delete this.modelCollection;
            });

            it('should split data', function() {
                expect(this.models.length).to.be.equal(3);
            });

            it('should set data to nested models', function() {
                expect(this.models[0].data).to.eql(this.data.item[0]);
                expect(this.models[1].data).to.eql(this.data.item[1]);
                expect(this.models[2].data).to.eql(this.data.item[2]);
            });

            it('should set params to nested models', function() {
                expect(this.models[0].params).to.eql({id: '1', foo: 'foo'});
                expect(this.models[1].params).to.eql({id: '2', foo: 'bar'});
                expect(this.models[2].params).to.eql({id: '3', foo: 'baz'});
            });

            it('should call _beforeSetData for split-models', function() {

                this.sinon.spy(this.model, '_beforeSetData');

                this.model.setData(ns.Model.TESTDATA.split1);

                expect(this.model._beforeSetData.calledOnce)
                    .to.be.equal(true);

                expect(this.model._beforeSetData.calledWith(ns.Model.TESTDATA.split1))
                    .to.be.equal(true);
            });

            it('should trigger `ns-model-changed` event', function() {
                this.models[0].setData({ id: 3, foo: 'barrr' });
                expect(this.changedCallback.callCount).to.be.equal(1);
            });

            it('should not duplicate trigger `ns-model-changed` event', function() {
                this.model.setData(this.data, { silent: true });
                this.model.setData(this.data, { silent: true });
                this.models[0].setData({ id: 1, foo: 'barrr' });
                expect(this.changedCallback.callCount).to.be.equal(1);
            });

            it('should trigger events by methodName', function() {
                this.models[0].trigger('event1');
                expect(this.methodNameCallback.callCount).to.be.equal(0);

                this.model.trigger('event1');
                expect(this.methodNameCallback.callCount).to.be.equal(1);
            });

            it('should trigger events by func', function() {
                this.models[0].trigger('event2');
                expect(this.methodCallback.callCount).to.be.equal(0);

                this.model.trigger('event2');
                expect(this.methodCallback.callCount).to.be.equal(1);
            });

            it('should not duplicate trigger events by methodName', function() {
                this.model.setData(this.data, { silent: true });
                this.model.setData(this.data, { silent: true });

                this.models[0].trigger('event1');
                expect(this.methodNameCallback.callCount).to.be.equal(0);

                this.model.trigger('event1');
                expect(this.methodNameCallback.callCount).to.be.equal(1);
            });

            it('should not duplicate trigger events by func', function() {
                this.model.setData(this.data, { silent: true });
                this.model.setData(this.data, { silent: true });

                this.models[0].trigger('event2');
                expect(this.methodCallback.callCount).to.be.equal(0);

                this.model.trigger('event2');
                expect(this.methodCallback.callCount).to.be.equal(1);
            });

            it('should not trigger if submodel not in collection now', function() {
                var data = this.data;
                data.item = data.item.slice(1, 3);
                var model = this.models[0];

                this.model.setData(data, { silent: true });

                model.setData({id: 1, foo: 'foo', bar: 'bar'});

                expect(this.changedCallback.called).not.to.be.equal(true);
            });

            it('should set models to collection without split', function() {
                this.modelCollection.insert(this.models);

                expect(this.modelCollection.models[0].data).to.eql(this.data.item[0]);
                expect(this.modelCollection.models[1].data).to.eql(this.data.item[1]);
                expect(this.modelCollection.models[2].data).to.eql(this.data.item[2]);
            });

            it('should trigger ns-model-insert & ns-model-remove on setData', function() {
                var removed;
                var inserted;

                this.model.on('ns-model-insert', function(name, models){ inserted = models[0].getData(); });
                this.model.on('ns-model-remove', function(name, models){ removed = models[0].getData(); });
                this.model.setData(this.newData);

                expect(removed).to.eql({id: '3', value: 'baz'});
                expect(inserted).to.eql({id: '4', value: 'zzap'});
            });

            it('should not trigger ns-model-insert or ns-model-remove on setData with old data', function() {
                var collection = ns.Model.get('mc0', {id : Math.random()});
                var insertCallback = this.sinon.spy();
                var removeCallback = this.sinon.spy();

                collection.on('ns-model-insert', insertCallback);
                collection.on('ns-model-remove', removeCallback);

                collection.setData(this.data);
                expect(insertCallback.callCount).to.eql(1);
                expect(removeCallback.callCount).to.eql(0);

                // Повторно вставляем старые данные. Не должно быть ns-model-insert
                collection.setData(this.data);
                expect(insertCallback.callCount).to.eql(1);
                expect(removeCallback.callCount).to.eql(0);
            });
        });

        describe('split моделей из корня "/"', function() {

            beforeEach(function() {
                ns.Model.define('mc', {
                    split: {
                        items: '/',
                        params: {id: '.id'},
                        model_id: 'mc-item'
                    }
                });
                ns.Model.define('mc-item', {
                    params: {id: null}
                });

                this.model = ns.Model.get('mc').setData([ {id: 1, val:1}, {id:2, val:2}  ])
            });

            it('должен вернуть массив из 2-элементов', function() {
                expect(this.model.getData()).to.have.length(2);
            });

        });

        describe('setData в ns-view-init', function() {

            beforeEach(function() {
                ns.Model.define('some-model', {
                    params: { id: null }
                });

                ns.Model.define('some-collection', {
                    split: {
                        items: '/',
                        params: {
                            id: '.id'
                        },
                        model_id: 'some-model'
                    },
                    events: {
                        'ns-model-init': 'init'
                    },
                    methods: {
                        isValid: no.true,
                        init: function() {
                            this.setData([
                                { id: 1, name: 'test' },
                                { id: 2, name: 'test' }
                            ]);
                        }
                    }
                });

                this.model = ns.Model.get('some-collection');
            });

            afterEach(function() {
                delete this.model;
            });

            it('должен создать коллекции из двух элементов', function() {
                expect(this.model.models).to.have.length(2);
            });

        });

        describe('insert', function() {

            beforeEach(function() {
                this.data = JSON.parse(JSON.stringify(ns.Model.TESTDATA.split1));

                this.model = ns.Model.get('mc0', { id: Math.random() });
                this.modelC = ns.Model.get('mc1', { id: Math.random() });
                this.modelC2 = ns.Model.get('mc2', { id: Math.random() });
                this.modelEmpty = ns.Model.get('mc0', { id: Math.random() });
                this.modelEmptyWithoutSplit = ns.Model.get('mc1', { id: Math.random() });

                this.model.setData(this.data, { silent: true });
                this.models = this.model.models;

                this.item1 = ns.Model.get('split1-item', { id: Math.random() }).setData({ id: 100, value: 'item1' });
                this.item2 = ns.Model.get('split1-item', { id: Math.random() }).setData({ id: 101, value: 'item2' });
                this.item3 = ns.Model.get('split1-item', { id: Math.random() }).setData({ id: 103, value: 'item3' });

                this.packItems = [this.item1, this.item2, this.item3];
            });

            afterEach(function() {
                delete this.data;
                delete this.model;
                delete this.modelC;
                delete this.modelC2;
                delete this.modelEmpty;
                delete this.modelEmptyWithoutSplit;
                delete this.models;
                delete this.item1;
                delete this.item2;
                delete this.item3;
                delete this.packItems;
            });

            // FIXME: отрефакторить бы этот набор тестов. Какой-то он непонятный и длинный

            it('should insert item in empty collection without split', function() {
                this.modelEmptyWithoutSplit.insert(this.item1);
                expect(this.modelEmptyWithoutSplit.getData().jpathItems[0]).to.eql(this.item1.getData());
            });

            it('should insert item in non empty collection without split', function() {
                this.modelEmptyWithoutSplit.setData({someData: 'a', someOtherData: 'b'});
                this.modelEmptyWithoutSplit.insert(this.item1);
                expect(this.modelEmptyWithoutSplit.getData().jpathItems[0]).to.eql(this.item1.getData());
            });

            it('should insert item', function() {
                this.model.insert(this.item1);
                expect(this.models[0].data).to.eql(this.data.item[0]);
                expect(this.models[1].data).to.eql(this.data.item[1]);
                expect(this.models[2].data).to.eql(this.data.item[2]);
                expect(this.models[3].data).to.eql(this.item1.data);
            });

            it('should be valid after inserting, if was "none"', function() {
                this.model.insert(this.item1);
                expect(this.model.isValid()).to.be.equal(true);
            });

            it('should be valid after inserting, if was "invalid"', function() {
                this.model.insert(this.item1);
                this.model.invalidate();
                this.model.insert(this.item2);
                expect(this.model.isValid()).to.be.equal(true);
            });

            it('should insert item in begin', function() {
                this.model.insert(this.item1, 0);
                expect(this.models.length).to.be.equal(4);
                expect(this.models[0].data).to.eql(this.item1.data);
            });

            it('should insert item by index', function() {
                this.model.insert(this.item1, 2);
                expect(this.models.length).to.be.equal(4);
                expect(this.models[2].data).to.eql(this.item1.data);
            });

            it('should insert few items into empty model', function() {
                this.modelEmpty.insert(this.packItems);
                expect(this.modelEmpty.models.length).to.be.equal(3);
                expect(this.modelEmpty.models[0].data).to.eql(this.item1.data);
                expect(this.modelEmpty.models[1].data).to.eql(this.item2.data);
                expect(this.modelEmpty.models[2].data).to.eql(this.item3.data);
            });

            it('should insert few items into empty model by index', function() {
                this.model.insert(this.packItems, 2);
                expect(this.models.length).to.be.equal(6);
                expect(this.models[0].data).to.eql(this.data.item[0]);
                expect(this.models[1].data).to.eql(this.data.item[1]);
                expect(this.models[2].data).to.eql(this.item1.data);
                expect(this.models[3].data).to.eql(this.item2.data);
                expect(this.models[4].data).to.eql(this.item3.data);
                expect(this.models[5].data).to.eql(this.data.item[2]);

            });

            it('.getData of splitted modelCollection should return data of nested models, located in split.items jpath', function() {
                this.modelEmpty.insert(this.packItems);
                expect(this.modelEmpty.getData().item[0]).to.eql(this.item1.getData());
                expect(this.modelEmpty.getData().item[1]).to.eql(this.item2.getData());
                expect(this.modelEmpty.getData().item[2]).to.eql(this.item3.getData());
            });

            it('Collection.getData should return all model\'s data in .jpathItems, if it\'s exists', function() {
                this.modelC.insert(this.packItems);
                expect(this.modelC.getData().jpathItems[0]).to.eql(this.item1.getData());
                expect(this.modelC.getData().jpathItems[1]).to.eql(this.item2.getData());
                expect(this.modelC.getData().jpathItems[2]).to.eql(this.item3.getData());
            });

            it('Collection.getData should return all model\'s data in .items', function() {
                this.modelC2.insert(this.packItems);
                expect(this.modelC2.getData().items[0]).to.eql(this.item1.getData());
                expect(this.modelC2.getData().items[1]).to.eql(this.item2.getData());
                expect(this.modelC2.getData().items[2]).to.eql(this.item3.getData());
            });

            it('should binding `ns-model-changed` event', function() {
                this.model.insert(this.item1, 2);
                this.models[2].setData({id: 100, value: 'ololo'});
                expect(this.changedCallback.callCount).to.be.equal(1);
            });

            it('should binding `ns-model-changed` event for few models', function() {
                this.model.insert(this.packItems);
                this.models[0].setData({ id: 1, value: 'foo' });
                this.models[3].setData({ id: 100, value: 'foo' });
                expect(this.changedCallback.callCount).to.be.equal(2);
            });

            it('should trigger `ns-insert` event once', function() {
                expect(this.insertCallback.callCount).to.be.equal(1);
            });

            it('should trigger `ns-insert` event twice', function() {
                this.model.insert(this.packItems);
                expect(this.insertCallback.callCount).to.be.equal(2);
            });

            it('should not insert duplicate models', function() {
                this.modelEmpty.insert(this.item1);
                this.modelEmpty.insert([this.item1, this.item2, this.item2]);
                expect(this.modelEmpty.models.length).to.be.equal(2);
                expect(this.modelEmpty.models[0]).to.eql(this.item1);
                expect(this.modelEmpty.models[1]).to.eql(this.item2);
            });

            it('should not trigger event on duplicate insertion', function() {
                this.model.insert(this.item1);
                this.model.insert(this.item1);

                // 2 is expected since one insertion has already happened.
                expect(this.insertCallback.callCount).to.be.equal(2);
            });

            it('should return false for completely duplicate insertion only', function() {
                this.modelEmpty.insert(this.item1);
                this.modelEmpty.insert(this.item2);

                var completelyDuplicate = this.modelEmpty.insert([this.item1, this.item2]);
                var partiallyDuplicate = this.modelEmpty.insert(this.packItems);

                expect(completelyDuplicate).to.be.equal(false);
                expect(partiallyDuplicate).to.be.equal(true);
            });

        });

        describe('remove', function() {

            beforeEach(function() {
                this.data = JSON.parse(JSON.stringify(ns.Model.TESTDATA.split1));

                this.model = ns.Model.get('mc0', { id: Math.random() });
                this.modelEmpty = ns.Model.get('mc0', { id: Math.random() });

                this.model.setData(this.data, { silent: true });

                this.models = this.model.models;

                this.item1 = this.models[0];
                this.item2 = this.models[1];
            });

            afterEach(function() {
                delete this.data;
                delete this.model;
                delete this.modelEmpty;
                delete this.models;
                delete this.item1;
                delete this.item2;
            });

            it('should remove item', function() {
                this.model.remove(this.item1);
                expect(this.models.length).to.be.equal(2);
            });

            it('should not trigger `ns-model-changed` event', function() {
                this.model.remove(this.item1);
                this.item1.setData({ id: 1, foo: 'bar' });
                expect(this.changedCallback.callCount).to.be.equal(0);
            });

            it('should not trigger custom event', function() {
                this.model.remove(this.item1);
                this.item1.trigger('event1');
                expect(this.methodNameCallback.callCount).to.be.equal(0);
            });

            it('should not trigger `ns-remove` event', function() {
                expect(this.removeCallback.callCount).to.be.equal(0);
            });

            it('should trigger `ns-remove` event once', function() {
                this.model.remove(this.item1);
                expect(this.removeCallback.callCount).to.be.equal(1);
            });

            it('should automatically remove destroyed models', function() {
                // Test `setData`-inserted model.
                ns.Model.destroy(this.item1);

                expect(this.model.models.length).to.be.equal(2);
                expect(this.removeCallback.callCount).to.be.equal(1);

                // Test `insert`-ed model.
                this.modelEmpty.insert(this.item2);
                expect(this.modelEmpty.models.length).to.be.equal(1);

                ns.Model.destroy(this.item2);
                expect(this.modelEmpty.models.length).to.be.equal(0);

                // `item2` was simultaneously removed from both
                // `model` and `modelEmpty`.
                expect(this.removeCallback.callCount).to.be.equal(3);
            });

            describe('удаление элементов из середины', function() {

                beforeEach(function() {

                    ns.Model.define('items', {
                        split: {
                            model_id: 'item',
                            items: '/',
                            params: {
                                'id': '.id'
                            }
                        }
                    });

                    ns.Model.define('item', {params: {id: null}});

                    /**
                     * @type ns.ModelCollection
                     */
                    this.items = ns.Model.get('items');
                    this.items.setData([{id: 0}, {id:1}, {id:2}, {id:3}, {id:4}]);
                });

                describe('в прямом порядке', function() {

                    beforeEach(function() {
                        this.items.remove([1,3]);
                    });

                    checkDeletionFromCollection();
                });

                describe('в обратном порядке', function() {

                    beforeEach(function() {
                        this.items.remove([3,1]);
                    });

                    checkDeletionFromCollection();

                });

                function checkDeletionFromCollection() {
                    it('должен оставить в коллекции 3 элемента', function() {
                        expect(this.items.models).to.have.length(3);
                    });

                    it('должен оставить 0-й элемент', function() {
                        expect(this.items.models[0]).to.be.equal(ns.Model.get('item', {id: 0}))
                    });

                    it('должен оставить 2-й элемент', function() {
                        expect(this.items.models[1]).to.be.equal(ns.Model.get('item', {id: 2}))
                    });

                    it('должен оставить 4-й элемент', function() {
                        expect(this.items.models[2]).to.be.equal(ns.Model.get('item', {id: 4}))
                    });
                }

            });

        });

        describe('clear', function() {

            beforeEach(function() {
                this.data = JSON.parse(JSON.stringify(ns.Model.TESTDATA.split1));

                this.model = ns.Model.get('mc0', { id: Math.random() });

                this.model.setData(this.data, { silent: true });

                this.item1 = this.model.models[0];
            });

            afterEach(function() {
                delete this.data;
                delete this.model;
                delete this.item1;
            });

            it('should remove all items', function() {
                this.model.clear();
                expect(this.model.models.length).to.be.equal(0);
            });

            it('should not trigger `change` event', function() {
                this.model.clear();
                this.item1.setData({ id: 1, foo: 'bar' });
                expect(this.changedCallback.callCount).to.be.equal(0);
            });

            it('should not trigger custom event', function() {
                this.model.clear();
                this.item1.trigger('event1');
                expect(this.methodNameCallback.callCount).to.be.equal(0);
            });

            it('должен бросить собитие ns-model-removed', function() {
                this.model.clear();
                expect(this.removeCallback).to.have.callCount(1);
            });

            it('должен бросить собитие ns-model-removed cо всеми удаленными моделями', function() {
                var MCItems = this.model.models;
                this.model.clear();
                expect(this.removeCallback).to.be.calledWith('ns-model-remove', MCItems);
            });

        });
    });

    describe('события от элементов коллекции', function() {

        beforeEach(function() {
            this.data = JSON.parse(JSON.stringify(ns.Model.TESTDATA.split1));

            this.mc = ns.Model.get('mc0', { id: Math.random() });
            this.mc.setData(this.data, { silent: true });

            this.models = this.mc.models;

            this.touchSpy = this.sinon.spy(this.mc, 'touch');
            this.onItemChangedSpy = this.sinon.spy(this.mc, 'onItemChanged');
            this.onItemTouchedSpy = this.sinon.spy(this.mc, 'onItemTouched');
            this.onItemDestroyedSpy = this.sinon.spy(this.mc, 'onItemDestroyed');
        });

        afterEach(function() {
            delete this.data;
            delete this.mc;
            delete this.models;
        });

        describe('события от элементов коллекции проксируются в саму коллекцию', function() {
            it('ns-model-changed', function() {
                var changedModel = this.models[0];

                changedModel.setData({});

                expect(this.onItemTouchedSpy.callCount).to.be.equal(1);
                expect(this.onItemTouchedSpy.calledWithExactly('ns-model-touched', changedModel)).to.be.equal(true);

                expect(this.onItemChangedSpy.callCount).to.be.equal(1);
                expect(this.onItemChangedSpy.calledWithExactly('ns-model-changed', changedModel, '')).to.be.equal(true);

                expect(this.touchSpy.callCount).to.be.equal(0);
                expect(this.changedCallback.callCount).to.be.equal(1);
                expect(this.changedCallback.calledWithExactly('ns-model-changed', { 'model': changedModel, 'jpath': ''})).to.be.equal(true);
            });

            it('ns-model-touched', function() {
                var touchedModel = this.models[0];

                touchedModel.touch();
                expect(this.touchSpy.callCount).to.be.equal(0);
                expect(this.onItemTouchedSpy.callCount).to.be.equal(1);
                expect(this.onItemTouchedSpy.calledWithExactly('ns-model-touched', touchedModel)).to.be.equal(true);
            });

            it('ns-model-before-destroyed', function() {
                var destroyedModel = this.models[1];
                var countElementsBefore = this.mc.models.length;

                destroyedModel.destroy();
                expect(this.onItemDestroyedSpy.callCount).to.be.equal(1);
                expect(this.onItemDestroyedSpy.calledWithExactly('ns-model-before-destroyed', destroyedModel)).to.be.equal(true);
                expect(this.mc.models.length).to.be.equal(countElementsBefore - 1);
            });
        });

        describe('события от элементов коллекции можно не проксировать', function() {
            it('ns-model-changed', function() {
                // Тут хитро восстанавливаем spy и создаём новый!
                this.mc.onItemChanged.restore();

                // Можно переопределить метод onItemChanged и не триггеирть в нём ns-model-changed на коллекции.
                this.mc.onItemChanged = function() {};

                this.onItemChangedSpy = this.sinon.spy(this.mc, 'onItemChanged');

                var changedModel = this.models[0];
                changedModel.setData({});

                expect(this.onItemTouchedSpy.callCount).to.be.equal(1);
                expect(this.changedCallback.callCount).to.be.equal(0);
            });
        });

        describe('при удалении элемента коллекции - отписываем коллекцию от его событий', function() {
            it('ns-model-changed', function() {
                var removedModel = this.models[0];

                // Before remove: events are heared
                removedModel.setData({});
                expect(this.onItemChangedSpy.callCount).to.be.equal(1);

                // After remove: no more
                this.mc.remove(removedModel);
                removedModel.setData({});
                expect(this.onItemChangedSpy.callCount).to.be.equal(1);
            });
        });

        describe('одна и та же модель в нескольких коллекциях', function() {

            beforeEach(function() {
                // Дополнительно создаём вторую коллекцию.
                this.mc2 = ns.Model.get('mc2', { id: Math.random() });
                this.onItemChangedSpy2 = this.sinon.spy(this.mc2, 'onItemChanged');
            });

            afterEach(function() {
                delete this.mc2;
            });

            it('события элемента слышат все коллекции (на примере ns-model-changed)', function() {
                this.mc2.insert(this.mc.models[0]);

                this.mc.models[0].setData({});
                expect(this.onItemChangedSpy.callCount).to.be.equal(1);
                expect(this.onItemChangedSpy2.callCount).to.be.equal(1);
            });

            it('когда удаляется из одной коллекции - другая продолжает слышать события (на примере ns-model-changed)', function() {
                this.mc2.insert(this.mc.models[0]);

                this.mc.models[0].setData({});
                this.mc2.remove(this.mc.models[0]);
                this.mc.models[0].setData({});

                expect(this.onItemChangedSpy.callCount).to.be.equal(2);
                expect(this.onItemChangedSpy2.callCount).to.be.equal(1);
            });

        });

    });

    describe('Разнородная коллекция', function() {

        beforeEach(function() {
            this.spy = this.sinon.spy(function(itemData) {
                if (itemData.type === 2) {
                    return 'mc-item2';

                } else if (itemData.type === 3) {
                    return false;
                }
                return 'mc-item1';
            });

            ns.Model.define('mc-item1', {
                params: {
                    id: null
                }
            });

            ns.Model.define('mc-item2', {
                params: {
                    id: null
                }
            });

            ns.Model.define('mc-mixed', {
                split: {
                    items: '.item',
                    params: {
                        id: '.id'
                    },
                    model_id: this.spy
                }
            });

            this.model = ns.Model.get('mc-mixed').setData({
                item: [
                    {type: 1},
                    {type: 2},
                    {type: 3}
                ]
            })
        });

        afterEach(function() {
            delete this.model;
            delete this.spy;
        });

        it('должен вызвать функцию из model_id для каждого элемента', function() {
            expect(this.spy).to.have.callCount(3);
        });

        it('должен разбить коллекцию на 2 элемента', function() {
            expect(this.model.models).to.have.length(2);
        });

        it('1-й элемент коллекции должен быть mc-item1', function() {
            expect(this.model.models[0].id).to.be.equal('mc-item1');
        });

        it('2-й элемент коллекции должен быть mc-item2', function() {
            expect(this.model.models[1].id).to.be.equal('mc-item2');
        });

    });

    describe('split моделей без явного указания items', function() {
        beforeEach(function() {
            ns.Model.define('test-mc', {
                split: {
                    model_id: 'test-mc-item',
                    params: { id: '.id' }
                }
            });
            ns.Model.define('test-mc-item', {
                params: {
                    id: null
                }
            });

            this.collection = ns.Model.get('test-mc');
            this.collection.setData({
                items: [{id: 1}, {id: 2}, {id: 3}]
            });
        });

        it('должен разбить коллекцию на три элемента', function() {
            expect(this.collection.models).to.have.length(3);
        })
    })
});
