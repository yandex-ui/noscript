describe('generate url', function() {

    describe('error thrown', function() {
        beforeEach(function() {
            ns.router.init();
        });

        it('if page name is unknown', function() {
            expect(function() { ns.router.generateUrl('new-page'); }).to.throw();
        });
    });

    describe('baseDir', function() {
        beforeEach(function() {
            ns.router.routes = {
                route: {
                    '/index': 'index',
                    '/': 'root'
                }
            };
            ns.router.init();
        });

        it('baseDir not specified', function() {
            expect( ns.router.generateUrl('root') ).to.be.equal('/');
            expect( ns.router.generateUrl('index') ).to.be.equal('/index');
        });

        it('baseDir specified', function() {
            ns.router.baseDir = '/the-base';
            expect( ns.router.generateUrl('root') ).to.be.equal('/the-base');
            expect( ns.router.generateUrl('index') ).to.be.equal('/the-base/index');
        });
    });

    describe('optional parameter', function() {

        beforeEach(function() {
            ns.router.routes = {
                route: {
                    '/folder/{name=inbox}': 'folder',
                    '/{context=}/alert': 'alert-somewhere',
                    '/folder/{name=inbox}/file': 'folder-file'
                }
            };
            ns.router.init();
        });

        it('not specified', function() {
            expect( ns.router.generateUrl('folder') ).to.be.equal('/folder');
            expect( ns.router.generateUrl('folder', {}) ).to.be.equal('/folder');
            expect( ns.router.generateUrl('folder', { id: 5 }) ).to.be.equal('/folder?id=5');
        });

        it('tail optional parameter', function() {
            expect( ns.router.generateUrl('folder', { name: 'favorites' }) ).to.be.equal('/folder/favorites');
            expect( ns.router.generateUrl('folder', { name: 'inbox' }) ).to.be.equal('/folder/inbox');
        });

        it('head optional parameter', function() {
            expect( ns.router.generateUrl('alert-somewhere') ).to.be.equal('/alert');
            expect( ns.router.generateUrl('alert-somewhere', { context: 'inbox' }) ).to.be.equal('/inbox/alert');
        });

        it('middle optional parameter', function() {
            expect( ns.router.generateUrl('folder-file') ).to.be.equal('/folder/file');
            expect( ns.router.generateUrl('folder-file', { name: 'inbox' }) ).to.be.equal('/folder/inbox/file');
            expect( ns.router.generateUrl('folder-file', { name: 'favorites' }) ).to.be.equal('/folder/favorites/file');
        });
    });

    describe('mandatory parameter', function() {
        beforeEach(function() {
            ns.router.routes = {
                route: {
                    '/folder/{name}': 'folder',
                    '/folder/{name}/{id:int}': 'file'
                }
            };
            ns.router.init();
        });

        it('not specified', function() {
            expect(function() { ns.router.generateUrl('folder'); }).to.throw();
            expect(function() { ns.router.generateUrl('file', { name: 'inbox' }); }).to.throw();
        });
    });

    describe('type validation', function() {
        beforeEach(function() {
            ns.router.routes = {
                route: {
                    '/{name}': 'folder',
                    '/{name}/{file:int}': 'file'
                }
            };
            ns.router.init();
        });

        it ('default type is id', function() {
            expect(function() { ns.router.generateUrl('folder', { name: 'abc' }); }).not.to.throw();
            expect(function() { ns.router.generateUrl('folder', { name: '1' }); }).to.throw();
        });

        it ('type specified directly', function() {
            expect(function() { ns.router.generateUrl('file', { name: 'abc', file: 7 }); }).not.to.throw();
            expect(function() { ns.router.generateUrl('file', { name: 'abc', file: 'myfile.txt' }); }).to.throw();
        });
    });

    describe('same layout with various params', function() {

        beforeEach(function() {
            ns.router.routes = {
                route: {
                    '/compose/{oper:id}/{mid:int}': 'compose',
                    '/compose/{mid:int}': 'compose',
                    '/compose': 'compose'
                }
            };
            ns.router.init();
        });

        var TESTS = [
            {
                layout: 'compose',
                params: {},
                url: '/compose'
            },
            {
                layout: 'compose',
                params: {mid: '1'},
                url: '/compose/1'
            },
            {
                layout: 'compose',
                params: {mid: '2', oper: 'reply'},
                url: '/compose/reply/2'
            }
        ];

        TESTS.forEach(function(test) {

            it('should generate "' + test.url +'" for "' + test.layout + '" ' + JSON.stringify(test.params), function() {
                expect(
                    ns.router.generateUrl(test.layout, test.params)
                ).to.be.equal(test.url);
            });

        });

    });

    describe('reverse rewrites', function() {
        beforeEach(function() {
            ns.router.routes = {
                rewriteUrl: {
                    '/': '/inbox',
                    '/inbox': '/folder/inbox',
                    '/shortcut': '/page/1'
                },
                route: {
                    '/page/{id:int}/{sid:int}': 'page',
                    '/page/{id:int}': 'page',
                    '/folder/{name}': 'folder'
                }
            };
            ns.router.init();
        });

        it('no matching rewrites', function() {
            expect(ns.router.generateUrl('page', { id: 2 })).to.be.eql('/page/2');
        });

        it('1 matching rewrite', function() {
            expect(ns.router.generateUrl('page', { id: 1 })).to.be.eql('/shortcut');
        });

        it('/page/1/2 -> /shortcut/2', function() {
            expect(ns.router.generateUrl('page', { id: 1, sid: 2 })).to.be.equal('/shortcut/2');
        });

        it('/page/11/2 -> /page/11/2', function() {
            expect(ns.router.generateUrl('page', { id: 11, sid: 2 })).to.be.equal('/page/11/2');
        });

        it('multiple matching rewrites', function() {
            expect(ns.router.generateUrl('folder', { name: 'inbox' })).to.be.equal('/');
        });
    });

    describe('generate url with query', function() {
        beforeEach(function() {
            ns.router.routes = {
                rewriteUrl: {
                    '/shortcut': '/page/1'
                },
                route: {
                    '/page/{id:int}': 'page'
                }
            };
            ns.router.init();
        });

        it('empty query', function() {
            expect(ns.router.generateUrl('page', { id: 2 })).to.be.eql('/page/2');
        });

        it('1 parameter goes into query', function() {
            expect(ns.router.generateUrl('page', { id: 2, page: 7 })).to.be.eql('/page/2?page=7');
        });

        it('more than 1 parameter goes into query', function() {
            expect(ns.router.generateUrl('page', { id: 2, page: 7, nc: '0123' })).to.be.eql('/page/2?page=7&nc=0123');
        });

        it('reverse rewrite and query', function() {
            expect(ns.router.generateUrl('page', { id: 1, page: 7, nc: '0123' })).to.be.eql('/shortcut?page=7&nc=0123');
        });
    });

    describe('special chars in url', function() {
        beforeEach(function() {
            ns.router.regexps['any'] = '.+';
            ns.router.routes = {
                route: {
                    '/tag/{tag:any}': 'tag'
                }
            };
            ns.router.init();
        });

        it('#', function() {
            expect(ns.router('/tag/%23cool')).to.be.eql({ page: 'tag', params: { tag: '#cool' } });
            expect(ns.router.generateUrl('tag', { tag: '#cool' })).to.be.eql('/tag/%23cool');
        });

        it('%%%', function() {
            expect(ns.router('/tag/%25%25%25')).to.be.eql({ page: 'tag', params: { tag: '%%%' } });
            expect(ns.router.generateUrl('tag', { tag: '%%%' })).to.be.eql('/tag/%25%25%25');
        });

    });

    describe('GET-параметры вне урла', function() {

        beforeEach(function() {
            ns.router.routes = {
                route: {
                    '/index/{id:int}': 'index'
                }
            };
            ns.router.init();
        });

        it('должен сгенерить /index/1?p=foo', function() {
            expect(ns.router.generateUrl('index', {id: 1, p: 'foo'})).to.be.equal('/index/1?p=foo');
        });

        it('должен сгенерить /index/1?p=foo%20bar', function() {
            expect(ns.router.generateUrl('index', {id: 1, p: 'foo bar'})).to.be.equal('/index/1?p=foo%20bar');
        });

        it('должен сгенерить /index/1?p=foo&p=bar', function() {
            expect(ns.router.generateUrl('index', {id: 1, p: ['foo', 'bar']})).to.be.equal('/index/1?p=foo&p=bar');
        });

        it('должен сгенерить /index/1?p=foo&p=bar', function() {
            expect(ns.router.generateUrl('index', {id: 1, p: ['1 1', '2 2']})).to.be.equal('/index/1?p=1%201&p=2%202');
        });

    });

    describe('Фильтры', function() {

        beforeEach(function() {
            ns.router.routes = {
                route: {
                    '/{index==value}/{id:int}': 'layout',
                    '/{id:int}': 'layout'
                }
            };
            ns.router.init();
        });

        it('работают', function() {
            expect(ns.router.generateUrl('layout', { id: 1, index: 'value' })).to.be.equal('/value/1');
        });

        it('не срабатывают, если не передано нужное значение', function() {
            expect(ns.router.generateUrl('layout', { id: 1 })).to.be.equal('/1');
        });

        it('не срабатывают, если передано неправильно значение', function() {
            expect(ns.router.generateUrl('layout', { id: 1, index: 'badvalue' })).to.be.equal('/1?index=badvalue');
        });

    });

});
