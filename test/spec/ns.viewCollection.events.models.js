describe('ns.ViewCollection. Подписка на события моделей.', function() {

    beforeEach(function() {
        ns.Model.define('collection', {
            split: {
                model_id: 'item',
                params: {id: '.id'},
                items: '.item'
            }
        });
        ns.Model.define('item', {params: {
            id: true
        }});

        this.collection = ns.Model.get('collection');
        this.collection.setData({item: [{
            id: 1, name: 'first item'
        }, {
            id: 2, name: 'second item'
        }, {
            id: 3, name: 'third item'
        }]});

        ns.View.define('app');
        this.viewApp = ns.View.create('app');

        ns.View.define('line', {
            models: {
                item: 'keepValid'
            }
        });

        ns.layout.define('app', {
            app: 'list'
        });
    });


    describe('По умолчанию.', function() {
        beforeEach(function(done) {
            ns.ViewCollection.define('list', {
                models: ['collection'],
                split: {
                    byModel: 'collection',
                    intoViews: 'line'
                }
            });

            new ns.Update(this.viewApp, ns.layout.page('app', {}), {})
                .start()
                .done(function() {done();});
        });

        it('после insert и remove в коллекции ViewCollection должен остаться валидным без учёта вложенностей', function() {
            var itemOld = ns.Model.get('item', {id: 2});
            var itemNew = ns.Model.get('item', {id: 4});

            itemNew.setData({id: 4, name: 'fourth item'});
            this.collection.remove(itemOld);
            this.collection.insert(itemNew);

            expect(this.viewApp.views.list.isValidSelf()).to.equal(true);
        });

        it('ViewCollection должен остаться валидным после событий на элементах коллекции', function() {
            var item = ns.Model.get('item', {id: 2});
            item.set('.value', 'second value');

            expect(this.viewApp.views.list.isValid()).to.equal(true);
        });

        it('ViewCollection должен проинвалидироваться при ns-model-changed коллекции', function() {
            this.collection.set('.dataSelf', {name: 'parent', value: 'parent value'});

            expect(this.viewApp.views.list.isValid()).to.equal(false);
        });

        it('ViewCollection должен проинвалидироваться при ns-model-destroyed коллекции', function() {
            ns.Model.destroy(this.collection);

            expect(this.viewApp.views.list.isValid()).to.equal(false);
        });
    });

    describe('При указании конкретных методов.', function() {
        beforeEach(function(done) {
            ns.ViewCollection.define('list', {
                models: {
                    collection: {
                        'ns-model-insert':    'onInsert',
                        'ns-model-remove':    'onRemove',
                        'ns-model-changed':   'onChanged',
                        'ns-model-destroyed': 'onDestroyed'
                    }
                },
                split: {
                    byModel: 'collection',
                    intoViews: 'line'
                },
                methods: {
                    onInsert: this.onInsert = this.sinon.spy(),
                    onRemove: this.onRemove = this.sinon.spy(),
                    onChanged: this.onChanged = this.sinon.spy(),
                    onDestroyed: this.onDestroyed = this.sinon.spy()
                }
            });

            new ns.Update(this.viewApp, ns.layout.page('app', {}), {})
                .start()
                .done(function() {done();});
        });

        describe('После событий коллекции', function() {

            beforeEach(function() {
                var itemOld = ns.Model.get('item', {id: 2});
                var itemNew = ns.Model.get('item', {id: 4});
                itemNew.setData({id: 4, name: 'fourth item'});

                this.collection.remove(itemOld);
                this.collection.insert(itemNew);
                this.collection.set('.dataSelf', {name: 'parent', value: 'parent value'});
            });

            it('ViewCollection должен вызвать соответствующие методы, указанные в декларации ', function() {
            	ns.Model.destroy(this.collection);

                expect(this.onInsert.callCount).to.equal(1);
                // ns-model-remove кидается два раза
                // один раз от this.collection.remove(itemOld);
                // второй раз при destroy this.collection
                expect(this.onRemove.callCount).to.equal(2);
                expect(this.onChanged.callCount).to.equal(1);
                expect(this.onDestroyed.callCount).to.equal(1);
            });

            it('ViewCollection должен остаться валидным', function() {
                expect(this.viewApp.views.list.isValid()).to.equal(true);
            });
        });

        

        // it('ViewCollection не должен вызывать методы при событиях элемента коллекции', function() {
        //     var item = ns.Model.get('item', {id: 2});
        //     item.set('.value', 'second value');
        //     ns.Model.destroy(item);

        //     expect(this.onChanged.callCount).to.equal(0);
        //     expect(this.onDestroyed.callCount).to.equal(0);
        // });

    });

});
