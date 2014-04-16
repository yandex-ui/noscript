describe('generate url', function() {
    afterEach(function() {
        ns.router.baseDir = '';
        ns.router.undefine();
    });

    describe('error thrown', function() {
        beforeEach(function() {
            ns.router.routes = {};
            ns.router.init();
        });

        afterEach(function() {
            delete ns.router.baseDir;
            ns.router.undefine();
        });

        it('if page name is unknown', function() {
            expect(function() { ns.router.generateUrl('new-page'); }).to.throwError();
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

        afterEach(function() {
            ns.router.baseDir = '';
            ns.router.undefine();
        });

        it('baseDir not specified', function() {
            expect( ns.router.generateUrl('root') ).to.be('/');
            expect( ns.router.generateUrl('index') ).to.be('/index');
        });

        it('baseDir specified', function() {
            ns.router.baseDir = '/the-base';
            expect( ns.router.generateUrl('root') ).to.be('/the-base');
            expect( ns.router.generateUrl('index') ).to.be('/the-base/index');
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

        afterEach(function() {
            ns.router.baseDir = '';
            ns.router.undefine();
        });

        it('not specified', function() {
            expect( ns.router.generateUrl('folder') ).to.be('/folder');
            expect( ns.router.generateUrl('folder', {}) ).to.be('/folder');
            expect( ns.router.generateUrl('folder', { id: 5 }) ).to.be('/folder?id=5');
        });

        it('tail optional parameter', function() {
            expect( ns.router.generateUrl('folder', { name: 'favorites' }) ).to.be('/folder/favorites');
            expect( ns.router.generateUrl('folder', { name: 'inbox' }) ).to.be('/folder/inbox');
        });

        it('head optional parameter', function() {
            expect( ns.router.generateUrl('alert-somewhere') ).to.be('/alert');
            expect( ns.router.generateUrl('alert-somewhere', { context: 'inbox' }) ).to.be('/inbox/alert');
        });

        it('middle optional parameter', function() {
            expect( ns.router.generateUrl('folder-file') ).to.be('/folder/file');
            expect( ns.router.generateUrl('folder-file', { name: 'inbox' }) ).to.be('/folder/inbox/file');
            expect( ns.router.generateUrl('folder-file', { name: 'favorites' }) ).to.be('/folder/favorites/file');
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

        afterEach(function() {
            ns.router.baseDir = '';
            ns.router.undefine();
        });

        it('not specified', function() {
            expect(function() { ns.router.generateUrl('folder'); }).to.throwError();
            expect(function() { ns.router.generateUrl('file', { name: 'inbox' }); }).to.throwError();
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

        afterEach(function() {
            ns.router.baseDir = '';
            ns.router.undefine();
        });

        it ('default type is id', function() {
            expect(function() { ns.router.generateUrl('folder', { name: 'abc' }); }).not.to.throwError();
            expect(function() { ns.router.generateUrl('folder', { name: '1' }); }).to.throwError();
        });

        it ('type specified directly', function() {
            expect(function() { ns.router.generateUrl('file', { name: 'abc', file: 7 }); }).not.to.throwError();
            expect(function() { ns.router.generateUrl('file', { name: 'abc', file: 'myfile.txt' }); }).to.throwError();
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
                ).to.be(test.url);
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
                    '/page/{id:int}': 'page',
                    '/folder/{name}': 'folder'
                }
            };
            ns.router.init();
        });

        afterEach(function() {
            ns.router.baseDir = '';
            ns.router.undefine();
        });

        it('no matching rewrites', function() {
            expect(ns.router.generateUrl('page', { id: 2 })).to.be.eql('/page/2');
        });

        it('1 matching rewrite', function() {
            expect(ns.router.generateUrl('page', { id: 1 })).to.be.eql('/shortcut');
        });

        it('multiple matching rewrites', function() {
            expect(ns.router.generateUrl('folder', { name: 'inbox' })).to.be.eql('/');
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

        afterEach(function() {
            ns.router.baseDir = '';
            ns.router.undefine();
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

        afterEach(function() {
            ns.router.baseDir = '';
            ns.router.undefine();
            delete ns.router.regexps['any'];
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

});
