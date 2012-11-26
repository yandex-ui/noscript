describe('no.layout', function() {

    describe('simple layouts', function() {

        it('app', function() {

            no.layout.define('app', {
                'app': {
                    'header': true,
                    'left@': {},
                    'right@': {},
                    'footer': true
                }
            });

            expect( no.layout.page('app') ).to.eql({
                'app': {
                    'header': {},
                    'left': {},
                    'right': {},
                    'footer': {}
                }
            });

            expect( no.layout.view('app') ).to.eql({
                'header': no.L.VIEW,
                'left': no.L.BOX,
                'right': no.L.BOX,
                'footer': no.L.VIEW
            });

            expect( no.layout.view('header') ).to.eql({});

        });

    });

    describe('extented layouts', function() {

        it('mailbox', function() {

            no.layout.define('mailbox', {
                'app left@': [ 'folders', 'labels' ]
            }, 'app');

            expect( no.layout.page('mailbox' ) ).to.eql({
                'app': {
                    'header': {},
                    'left': {
                        'folders': {},
                        'labels': {}
                    },
                    'right': {},
                    'footer': {}
                }
            });

        });

        it('messages', function() {

            no.layout.define('messages', {
                'app right@': 'messages'
            }, 'mailbox');

            expect( no.layout.page('messages' ) ).to.eql({
                'app': {
                    'header': {},
                    'left': {
                        'folders': {},
                        'labels': {}
                    },
                    'right': {
                        'messages': {}
                    },
                    'footer': {}
                }
            });

        });

    });

    describe('dynamic layouts', function() {

        it('setup', function() {

            no.layout.define('setup', {
                'app left@': 'setup-menu',
                'app right@': {
                    'setup-{ .tab }': {
                        'content@': {
                            'setup-submenu': true,
                            'setup-blocks': true
                        }
                    }
                }
            }, 'app');


            expect( no.layout.page('setup', { tab: 'interface' }) ).to.eql({
                'app': {
                    'header': {},
                    'left': {
                        'setup-menu': {}
                    },
                    'right': {
                        'setup-interface': {
                            'content': {
                                'setup-submenu': {},
                                'setup-blocks': {}
                            }
                        }
                    },
                    'footer': {}
                }
            });

            expect( no.layout.view('setup-interface') ).to.eql({
                'content': no.L.BOX
            });

        });

        it('setup-filters', function() {

            no.layout.define('setup-filters', {
                'app right@ setup-{ .tab } content@': {
                    'setup-blocks': true
                }
            }, 'setup');

            expect( no.layout.page('setup-filters', { tab: 'filters' }) ).to.eql({
                'app': {
                    'header': {},
                    'left': {
                        'setup-menu': {}
                    },
                    'right': {
                        'setup-filters': {
                            'content': {
                                'setup-blocks': {}
                            }
                        }
                    },
                    'footer': {}
                }
            });

        });


        it('message', function() {

            no.layout.define('message', {
                'app right@': function(params) {
                    return (params.ids) ? 'message' : 'messages';
                }
            }, 'mailbox');

            expect( no.layout.page('message', { ids: "1234567890" }) ).to.eql({
                'app': {
                    'header': {},
                    'left': {
                        'folders': {},
                        'labels': {}
                    },
                    'right': {
                        'message': {}
                    },
                    'footer': {}
                }
            });

            expect( no.layout.page('message', { current_folder: "9876543210" }) ).to.eql({
                'app': {
                    'header': {},
                    'left': {
                        'folders': {},
                        'labels': {}
                    },
                    'right': {
                        'messages': {}
                    },
                    'footer': {}
                }
            });

        });

    });

});

