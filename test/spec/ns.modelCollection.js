describe('ns.ModelCollection', function() {

    beforeEach(function() {
        var methodCallback = this.methodCallback = sinon.spy();
        var methodNameCallback = this.methodNameCallback = sinon.spy();
        var changedCallback = this.changedCallback = sinon.spy();

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
                // 'event1': function() {
                //     methodNameCallback();
                // },
                'event2': function() {
                    methodCallback();
                },
                'changed': function() {
                    changedCallback();
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
    });

    afterEach(function() {
        delete this.methodCallback;
        delete this.methodNameCallback;
        delete this.changedCallback;
        ns.Model.undefine();
    });

    describe('prototype', function() {

        describe('_splitData', function() {

            beforeEach(function() {
                this.data = JSON.parse(JSON.stringify(ns.Model.TESTDATA.split1));

                this.model = ns.Model.create('mc0', { id: Math.random() });

                this.model._splitData(this.data);

                this.models = this.model.models;
            });

            afterEach(function() {
                delete this.data;
                delete this.model;
                delete this.models;
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

            it('should trigger `changed` event', function() {
                // this.models[0].setData({ id: 1, foo: 'barrr' });
                this.models[0].setData({ id: 3, foo: 'barrr' });
                expect(this.changedCallback.callCount).to.be(1);
            });

            it('should not duplicate trigger `changed` event', function() {
                this.model._splitData(this.data);
                this.model._splitData(this.data);
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
                this.model._splitData(this.data);
                this.model._splitData(this.data);
                this.models[0].trigger('event1');
                expect(this.methodNameCallback.callCount).to.be(1);
            });

            it('should not duplicate trigger events by func', function() {
                this.model._splitData(this.data);
                this.model._splitData(this.data);
                this.models[0].trigger('event2');
                expect(this.methodCallback.callCount).to.be(1);
            });

            it('should not trigger if submodel not in collection now', function() {
                var data = this.data;
                data.item = data.item.slice(1, 3);
                var model = this.models[0];

                this.model._splitData(data);

                model.setData({id: 1, foo: 'foo', bar: 'bar'});

                expect(this.changedCallback.called).not.to.be.ok();
            });

        });

        describe('insert', function() {

            beforeEach(function() {
                this.data = JSON.parse(JSON.stringify(ns.Model.TESTDATA.split1));

                this.model = ns.Model.create('mc0', { id: Math.random() });
                this.modelEmpty = ns.Model.create('mc0', { id: Math.random() });

                this.model._splitData(this.data);
                this.models = this.model.models;

                this.item1 = ns.Model.create('split1-item', { id: Math.random() }, { id: 100, value: 'item1' });
                this.item2 = ns.Model.create('split1-item', { id: Math.random() }, { id: 101, value: 'item2' });
                this.item3 = ns.Model.create('split1-item', { id: Math.random() }, { id: 103, value: 'item3' });

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

            it('should binding `changed` event', function() {
                this.model.insert(this.item1, 2);
                this.models[2].setData({id: 100, value: 'ololo'});
                expect(this.changedCallback.callCount).to.be(1);
            });

            it('should binding `changed` event for few models', function() {
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

        });

        describe('remove', function() {

            beforeEach(function() {
                this.data = JSON.parse(JSON.stringify(ns.Model.TESTDATA.split1));

                this.model = ns.Model.create('mc0', { id: Math.random() });

                this.model._splitData(this.data);

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

            it('should not trigger `changed` event', function() {
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

        });

        describe('clear', function() {

            beforeEach(function() {
                this.data = JSON.parse(JSON.stringify(ns.Model.TESTDATA.split1));

                this.model = ns.Model.create('mc0', { id: Math.random() });

                this.model.trigger = sinon.spy();
                this.model._splitData(this.data);

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
