describe('ns.layout', function() {

    afterEach(function() {
        ns.clean();
    });

    beforeEach(function() {
        ns.layout.define('app', {
            'app': {
                'header': true,
                'left@': {},
                'right@': {},
                'footer': true
            }
        });
    });

    describe('simple layouts', function() {

        it('app', function() {

            expect( ns.layout.page('app') ).to.eql({
                'app': {
                    'type': ns.L.VIEW,
                    'views': {
                        'header': {
                            'type': ns.L.VIEW,
                            'views': {}
                        },
                        'left': {
                            'type': ns.L.BOX,
                            'views': {}
                        },
                        'right': {
                            'type': ns.L.BOX,
                            'views': {}
                        },
                        'footer': {
                            'type': ns.L.VIEW,
                            'views': {}
                        }
                    }
                }
            });
        });

    });

    describe('extented layouts', function() {

        beforeEach(function() {
            ns.layout.define('mailbox', {
                'app left@': [ 'folders', 'labels' ]
            }, 'app');

            ns.layout.define('messages', {
                'app right@': 'messages'
            }, 'mailbox');
        });

        it('mailbox', function() {

            expect( ns.layout.page('mailbox' ) ).to.eql({
                'app': {
                    'type': ns.L.VIEW,
                    'views': {
                        'header': {
                            'type': ns.L.VIEW,
                            'views': {}
                        },
                        'left': {
                            'type': ns.L.BOX,
                            'views': {
                                'folders': {
                                    'type': ns.L.VIEW,
                                    'views': {}
                                },
                                'labels': {
                                    'type': ns.L.VIEW,
                                    'views': {}
                                }
                            }
                        },
                        'right': {
                            'type': ns.L.BOX,
                            'views': {}
                        },
                        'footer': {
                            'type': ns.L.VIEW,
                            'views': {}
                        }
                    }
                }
            });

        });

        it('messages', function() {

            expect( ns.layout.page('messages' ) ).to.eql({
                'app': {
                    'type': ns.L.VIEW,
                    'views': {
                        'header': {
                            'type': ns.L.VIEW,
                            'views': {}
                        },
                        'left': {
                            'type': ns.L.BOX,
                            'views': {
                                'folders': {
                                    'type': ns.L.VIEW,
                                    'views': {}
                                },
                                'labels': {
                                    'type': ns.L.VIEW,
                                    'views': {}
                                }
                            }
                        },
                        'right': {
                            'type': ns.L.BOX,
                            'views': {
                                'messages': {
                                    'type': ns.L.VIEW,
                                    'views': {}
                                }
                            }
                        },
                        'footer': {
                            'type': ns.L.VIEW,
                            'views': {}
                        }
                    }
                }
            });

        });

    });

    describe('async views', function() {

        beforeEach(function() {
            ns.layout.define('async1', {
                'app left@': 'long-generated-view&'
            }, 'app');

            ns.layout.define('async2', {
                'app left@': {
                    'regular-view': {
                        'async-view&': true
                    }
                }
            }, 'app');
        });

        it('async view in box', function() {

            expect( ns.layout.page('async1') ).to.eql({
                'app': {
                    'type': ns.L.VIEW,
                    'views': {
                        'header': {
                            'type': ns.L.VIEW,
                            'views': {}
                        },
                        'left': {
                            'type': ns.L.BOX,
                            'views': {
                                'long-generated-view': {
                                    'type': ns.L.ASYNC,
                                    'views': {}
                                }
                            }
                        },
                        'right': {
                            'type': ns.L.BOX,
                            'views': {}
                        },
                        'footer': {
                            'type': ns.L.VIEW,
                            'views': {}
                        }
                    }
                }
            });
        });

        it('async view in box', function() {

            expect( ns.layout.page('async2') ).to.eql({
                'app': {
                    'type': ns.L.VIEW,
                    'views': {
                        'header': {
                            'type': ns.L.VIEW,
                            'views': {}
                        },
                        'left': {
                            'type': ns.L.BOX,
                            'views': {
                                'regular-view': {
                                    'type': ns.L.VIEW,
                                    'views': {
                                        'async-view': {
                                            'type': ns.L.ASYNC,
                                            'views': {}
                                        }
                                    }
                                }
                            }
                        },
                        'right': {
                            'type': ns.L.BOX,
                            'views': {}
                        },
                        'footer': {
                            'type': ns.L.VIEW,
                            'views': {}
                        }
                    }
                }
            });
        });
    });

    describe('dynamic layouts', function() {

        beforeEach(function() {
            ns.layout.define('setup', {
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

            ns.layout.define('setup-filters', {
                'app right@ setup-{ .tab } content@': {
                    'setup-blocks': true
                }
            }, 'setup');

            ns.layout.define('mailbox', {
                'app left@': [ 'folders', 'labels' ]
            }, 'app');

            ns.layout.define('message', {
                'app right@': function(params) {
                    return (params.ids) ? 'message' : 'messages';
                }
            }, 'mailbox');
        });

        it('setup', function() {

            expect( ns.layout.page('setup', { tab: 'interface' }) ).to.eql({
                'app': {
                    'type': ns.L.VIEW,
                    'views': {
                        'header': {
                            'type': ns.L.VIEW,
                            'views': {}
                        },
                        'left': {
                            'type': ns.L.BOX,
                            'views': {
                                'setup-menu': {
                                    'type': ns.L.VIEW,
                                    'views': {}
                                }
                            }
                        },
                        'right': {
                            'type': ns.L.BOX,
                            'views': {
                                'setup-interface': {
                                    'type': ns.L.VIEW,
                                    'views': {
                                        'content': {
                                            'type': ns.L.BOX,
                                            'views': {
                                                'setup-submenu': {
                                                    'type': ns.L.VIEW,
                                                    'views': {}
                                                },
                                                'setup-blocks': {
                                                    'type': ns.L.VIEW,
                                                    'views': {}
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        'footer': {
                            'type': ns.L.VIEW,
                            'views': {}
                        }
                    }
                }
            });
        });

        it('setup-filters', function() {

            expect( ns.layout.page('setup-filters', { tab: 'filters' }) ).to.eql({
                'app': {
                    'type': ns.L.VIEW,
                    'views': {
                        'header': {
                            'type': ns.L.VIEW,
                            'views': {}
                        },
                        'left': {
                            'type': ns.L.BOX,
                            'views': {
                                'setup-menu': {
                                    'type': ns.L.VIEW,
                                    'views': {}
                                }
                            }
                        },
                        'right': {
                            'type': ns.L.BOX,
                            'views': {
                                'setup-filters': {
                                    'type': ns.L.VIEW,
                                    'views': {
                                        'content': {
                                            'type': ns.L.BOX,
                                            'views': {
                                                'setup-blocks': {
                                                    'type': ns.L.VIEW,
                                                    'views': {}
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        'footer': {
                            'type': ns.L.VIEW,
                            'views': {}
                        }
                    }
                }
            });
        });


        it('choose box from params', function() {

            expect( ns.layout.page('message', { ids: "1234567890" }) ).to.eql({
                'app': {
                    'type': ns.L.VIEW,
                    'views': {
                        'header': {
                            'type': ns.L.VIEW,
                            'views': {}
                        },
                        'left': {
                            'type': ns.L.BOX,
                            'views': {
                                'folders': {
                                    'type': ns.L.VIEW,
                                    'views': {}
                                },
                                'labels': {
                                    'type': ns.L.VIEW,
                                    'views': {}
                                }
                            }
                        },
                        'right': {
                            'type': ns.L.BOX,
                            'views': {
                                'message': {
                                    'type': ns.L.VIEW,
                                    'views': {}
                                }
                            }
                        },
                        'footer': {
                            'type': ns.L.VIEW,
                            'views': {}
                        }
                    }
                }
            });

            expect( ns.layout.page('message', { current_folder: "9876543210" }) ).to.eql({
                'app': {
                    'type': ns.L.VIEW,
                    'views': {
                        'header': {
                            'type': ns.L.VIEW,
                            'views': {}
                        },
                        'left': {
                            'type': ns.L.BOX,
                            'views': {
                                'folders': {
                                    'type': ns.L.VIEW,
                                    'views': {}
                                },
                                'labels': {
                                    'type': ns.L.VIEW,
                                    'views': {}
                                }
                            }
                        },
                        'right': {
                            'type': ns.L.BOX,
                            'views': {
                                'messages': {
                                    'type': ns.L.VIEW,
                                    'views': {}
                                }
                            }
                        },
                        'footer': {
                            'type': ns.L.VIEW,
                            'views': {}
                        }
                    }
                }
            });
        });

    });

});

