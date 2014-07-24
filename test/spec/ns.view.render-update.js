describe('Виды должны обновлять то, что отрендерили', function() {

    describe('ns.ViewCollection', function() {

        beforeEach(function() {

            this.sinon.server.autoRespond = true;
            this.sinon.server.respond(function(xhr) {
                xhr.respond(
                    200,
                    {"Content-Type": "application/json"},
                    JSON.stringify({
                        models: [
                            {
                                data: {
                                    items: [
                                        {id: '1', val: 1},
                                        {id: '2', val: 2},
                                        {id: '3', val: 3}
                                    ]
                                }
                            }
                        ]
                    })
                );
            });

            ns.layout.define('app', {
                'app': {
                    'vc': {}
                }
            });

            ns.Model.define('mc', {
                split: {
                    model_id: 'mc-item',
                    items: '.items',
                    params: {
                        id: '.id'
                    }
                }
            });
            ns.Model.define('mc-item', {
                params: {
                    id: null
                }
            });

            ns.View.define('app');
            ns.ViewCollection.define('vc', {
                models: ['mc'],
                split: {
                    byModel: 'mc',
                    intoViews: 'vc-item'
                }
            });

            ns.View.define('vc-item', {
                models: ['mc-item']
            });


            this.view = ns.View.create('app');
            this.layout = ns.layout.page('app');

            // первая отрисовка коллекции
            return new ns.Update(this.view, this.layout, {})
                .render()
                .then(function(result) {
                    this.result = result;
                }, this);
        });

        it('не должно быть перерисовок, если модель изменилась после рендеринга', function() {
            this.firstDrawHTML = this.view.node.innerHTML;

            // эмулируем поведение, что где-то посередине ns.Update один элемент коллекции себя изменил
            var originalInsertNodes = ns.Update.prototype._insertNodes;
            this.sinon.stub(ns.Update.prototype, '_insertNodes', function(node, async) {
                ns.Model.get('mc-item', {id: 1}).touch();
                return originalInsertNodes.call(this, node, async);
            });

            // коллекция должна отрисовать ровно то, что отрендерила
            return new ns.Update(this.view, this.layout, {})
                .render()
                .then(function() {
                    expect(this.view.node.innerHTML).to.be.equal(this.firstDrawHTML);
                }, this);
        });

    });
});
