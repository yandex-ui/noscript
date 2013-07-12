describe('ns.ModelCollection', function() {

    beforeEach(function() {
        var methodCallback = this.methodCallback = sinon.spy();
        var methodNameCallback = this.methodNameCallback = sinon.spy();
        var changedCallback = this.changedCallback = sinon.spy();
        var insertCallback = this.insertCallback = sinon.spy();
        var removeCallback = this.removeCallback = sinon.spy();

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
                'ns-model-changed': function() {
                    changedCallback();
                },
                'ns-model-insert': function() {
                    insertCallback();
                },
                'ns-model-remove': function() {
                    removeCallback();
                }
            },

            methods: {
                onEvent1: function ev1() {
                    methodNameCallback();
                }
            }
        });

        ns.Model.define('split1-item', {
            params: {
                id: null
            }
        });

        ns.Model.define('mc1', {
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

        describe('setData', function() {

            beforeEach(function() {
                this.data = JSON.parse(JSON.stringify(ns.Model.TESTDATA.split1));

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
                expect(this.models.length).to.be(3);
            });

            it('should set data to nested models', function() {
                expect(this.models[0].data).to.eql(this.data.item[0]);
                expect(this.models[1].data).to.eql(this.data.item[1]);
                expect(this.models[2].data).to.eql(this.data.item[2]);
            });

            it('should set params to nested models', function() {
                expect(this.models[0].params).to.eql({id: 1, foo: 'foo'});
                expect(this.models[1].params).to.eql({id: 2, foo: 'bar'});
                expect(this.models[2].params).to.eql({id: 3, foo: 'baz'});
            });

            it('should call _setData for split-models', function() {

                sinon.spy(this.model, '_setData');

                this.model.setData(ns.Model.TESTDATA.split1);

                expect(this.model._setData.calledOnce)
                    .to.be.ok();

                expect(this.model._setData.calledWith(ns.Model.TESTDATA.split1))
                    .to.be.ok();
            });

            it('should trigger `ns-model-changed` event', function() {
                this.models[0].setData({ id: 3, foo: 'barrr' });
                expect(this.changedCallback.callCount).to.be(1);
            });

            it('should not duplicate trigger `ns-model-changed` event', function() {
                this.model.setData(this.data, { silent: true });
                this.model.setData(this.data, { silent: true });
                this.models[0].setData({ id: 1, foo: 'barrr' });
                expect(this.changedCallback.callCount).to.be(1);
            });

            it('should trigger events by methodName', function() {
                this.models[0].trigger('event1');
                expect(this.methodNameCallback.callCount).to.be(1);
            });

            it('should trigger events by func', function() {
                this.models[0].trigger('event2');
                expect(this.methodCallback.callCount).to.be(1);
            });

            it('should not duplicate trigger events by methodName', function() {
                this.model.setData(this.data, { silent: true });
                this.model.setData(this.data, { silent: true });
                this.models[0].trigger('event1');
                expect(this.methodNameCallback.callCount).to.be(1);
            });

            it('should not duplicate trigger events by func', function() {
                this.model.setData(this.data, { silent: true });
                this.model.setData(this.data, { silent: true });
                this.models[0].trigger('event2');
                expect(this.methodCallback.callCount).to.be(1);
            });

            it('should not trigger if submodel not in collection now', function() {
                var data = this.data;
                data.item = data.item.slice(1, 3);
                var model = this.models[0];

                this.model.setData(data, { silent: true });

                model.setData({id: 1, foo: 'foo', bar: 'bar'});

                expect(this.changedCallback.called).not.to.be.ok();
            });

            it('should set models to collection without split', function() {
                this.modelCollection.setData(this.models);

                expect(this.modelCollection.models[0].data).to.eql(this.data.item[0]);
                expect(this.modelCollection.models[1].data).to.eql(this.data.item[1]);
                expect(this.modelCollection.models[2].data).to.eql(this.data.item[2]);
            });

            it('should trigger event on collection form other collection', function() {
                this.modelCollection.setData(this.models);
                this.modelCollection.models[0].trigger('event1');
                expect(this.methodNameCallback.callCount).to.be(1);
            });

        });

        describe('insert', function() {

            beforeEach(function() {
                this.data = JSON.parse(JSON.stringify(ns.Model.TESTDATA.split1));

                this.model = ns.Model.get('mc0', { id: Math.random() });
                this.modelEmpty = ns.Model.get('mc0', { id: Math.random() });

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
                delete this.modelEmpty;
                delete this.models;
                delete this.item1;
                delete this.item2;
                delete this.item3;
                delete this.packItems;
            });

            it('should insert item', function() {
                this.model.insert(this.item1);
                expect(this.models[0].data).to.eql(this.data.item[0]);
                expect(this.models[1].data).to.eql(this.data.item[1]);
                expect(this.models[2].data).to.eql(this.data.item[2]);
                expect(this.models[3].data).to.eql(this.item1.data);
            });

            it('should insert item in begin', function() {
                this.model.insert(this.item1, 0);
                expect(this.models.length).to.be(4);
                expect(this.models[0].data).to.eql(this.item1.data);
            });

            it('should insert item by index', function() {
                this.model.insert(this.item1, 2);
                expect(this.models.length).to.be(4);
                expect(this.models[2].data).to.eql(this.item1.data);
            });

            it('should insert few items into empty model', function() {
                this.modelEmpty.insert(this.packItems);
                expect(this.modelEmpty.models.length).to.be(3);
                expect(this.modelEmpty.models[0].data).to.eql(this.item1.data);
                expect(this.modelEmpty.models[1].data).to.eql(this.item2.data);
                expect(this.modelEmpty.models[2].data).to.eql(this.item3.data);
            });

            it('should insert few items into empty model by index', function() {
                this.model.insert(this.packItems, 2);
                expect(this.models.length).to.be(6);
                expect(this.models[0].data).to.eql(this.data.item[0]);
                expect(this.models[1].data).to.eql(this.data.item[1]);
                expect(this.models[2].data).to.eql(this.item1.data);
                expect(this.models[3].data).to.eql(this.item2.data);
                expect(this.models[4].data).to.eql(this.item3.data);
                expect(this.models[5].data).to.eql(this.data.item[2]);

            });

            it('should binding `ns-model-changed` event', function() {
                this.model.insert(this.item1, 2);
                this.models[2].setData({id: 100, value: 'ololo'});
                expect(this.changedCallback.callCount).to.be(1);
            });

            it('should binding `ns-model-changed` event for few models', function() {
                this.model.insert(this.packItems);
                this.models[0].setData({ id: 1, value: 'foo' });
                this.models[3].setData({ id: 100, value: 'foo' });
                expect(this.changedCallback.callCount).to.be(2);
            });

            it('should binding custom events for few models', function() {
                this.model.insert(this.packItems);
                this.models[0].trigger('event2');
                this.models[3].trigger('event2');
                expect(this.methodCallback.callCount).to.be(2);
            });

            it('should binding custom events for few models', function() {
                this.model.insert(this.packItems);
                this.models[0].trigger('event1');
                this.models[3].trigger('event1');
                expect(this.methodNameCallback.callCount).to.be(2);
            });

            it('should trigger `ns-insert` event once', function() {
                expect(this.insertCallback.callCount).to.be(1);
            });

            it('should trigger `ns-insert` event twice', function() {
                this.model.insert(this.packItems);
                expect(this.insertCallback.callCount).to.be(2);
            });

        });

        describe('remove', function() {

            beforeEach(function() {
                this.data = JSON.parse(JSON.stringify(ns.Model.TESTDATA.split1));

                this.model = ns.Model.get('mc0', { id: Math.random() });

                this.model.setData(this.data, { silent: true });

                this.models = this.model.models;

                this.item1 = this.models[0];
            });

            afterEach(function() {
                delete this.data;
                delete this.model;
                delete this.models;
                delete this.item1;
            });

            it('should remove item', function() {
                this.model.remove(this.item1);
                expect(this.models.length).to.be(2);
            });

            it('should not trigger `ns-model-changed` event', function() {
                this.model.remove(this.item1);
                this.item1.setData({ id: 1, foo: 'bar' });
                expect(this.changedCallback.callCount).to.be(0);
            });

            it('should not trigger custom event', function() {
                this.model.remove(this.item1);
                this.item1.trigger('event1');
                expect(this.methodNameCallback.callCount).to.be(0);
            });

            it('should not duplicate trigger custom event', function() {
                this.model.remove(this.item1);
                this.model.insert(this.item1);
                this.item1.trigger('event1');
                expect(this.methodNameCallback.callCount).to.be(1);
            });

            it('should not trigger `ns-remove` event', function() {
                expect(this.removeCallback.callCount).to.be(0);
            });

            it('should trigger `ns-remove` event once', function() {
                this.model.remove(this.item1);
                expect(this.removeCallback.callCount).to.be(1);
            });

        });

        describe('clear', function() {

            beforeEach(function() {
                this.data = JSON.parse(JSON.stringify(ns.Model.TESTDATA.split1));

                this.model = ns.Model.get('mc0', { id: Math.random() });

                this.model.trigger = sinon.spy();
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
                expect(this.model.models.length).to.be(0);
            });

            it('should not trigger `change` event', function() {
                this.model.clear();
                this.item1.setData({ id: 1, foo: 'bar' });
                expect(this.changedCallback.callCount).to.be(0);
            });

            it('should not trigger custom event', function() {
                this.model.clear();
                this.item1.trigger('event1');
                expect(this.methodNameCallback.callCount).to.be(0);
            });

        });
    });

});
