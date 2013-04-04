describe('no.layout', function() {

    describe('simple layouts', function() {

        it('app', function() {

            ns.layout.define('app', {
                'app': {
                    'header': true,
                    'left@': {},
                    'right@': {},
                    'footer': true
                }
            });

            expect( no.layout.page('app') ).to.eql({
                'app': {
                    'type': no.L.VIEW,
                    'views': {
                        'header': {
                            'type': no.L.VIEW,
                            'views': {}
                        },
                        'left': {
                            'type': no.L.BOX,
                            'views': {}
                        },
                        'right': {
                            'type': no.L.BOX,
                            'views': {}
                        },
                        'footer': {
                            'type': no.L.VIEW,
                            'views': {}
                        }
                    }
                }
            });
        });

    });

    describe('extented layouts', function() {

        it('mailbox', function() {

            ns.layout.define('mailbox', {
                'app left@': [ 'folders', 'labels' ]
            }, 'app');

            expect( no.layout.page('mailbox' ) ).to.eql({
                'app': {
                    'type': no.L.VIEW,
                    'views': {
                        'header': {
                            'type': no.L.VIEW,
                            'views': {}
                        },
                        'left': {
                            'type': no.L.BOX,
                            'views': {
                                'folders': {
                                    'type': no.L.VIEW,
                                    'views': {}
                                },
                                'labels': {
                                    'type': no.L.VIEW,
                                    'views': {}
                                }
                            }
                        },
                        'right': {
                            'type': no.L.BOX,
                            'views': {}
                        },
                        'footer': {
                            'type': no.L.VIEW,
                            'views': {}
                        }
                    }
                }
            });

        });

        it('messages', function() {

            ns.layout.define('messages', {
                'app right@': 'messages'
            }, 'mailbox');

            expect( no.layout.page('messages' ) ).to.eql({
                'app': {
                    'type': no.L.VIEW,
                    'views': {
                        'header': {
                            'type': no.L.VIEW,
                            'views': {}
                        },
                        'left': {
                            'type': no.L.BOX,
                            'views': {
                                'folders': {
                                    'type': no.L.VIEW,
                                    'views': {}
                                },
                                'labels': {
                                    'type': no.L.VIEW,
                                    'views': {}
                                }
                            }
                        },
                        'right': {
                            'type': no.L.BOX,
                            'views': {
                                'messages': {
                                    'type': no.L.VIEW,
                                    'views': {}
                                }
                            }
                        },
                        'footer': {
                            'type': no.L.VIEW,
                            'views': {}
                        }
                    }
                }
            });

        });

    });

    describe('async views', function() {

        it('async view in box', function() {
            ns.layout.define('async1', {
                'app left@': 'long-generated-view&'
            }, 'app');

            expect( no.layout.page('async1') ).to.eql({
                'app': {
                    'type': no.L.VIEW,
                    'views': {
                        'header': {
                            'type': no.L.VIEW,
                            'views': {}
                        },
                        'left': {
                            'type': no.L.BOX,
                            'views': {
                                'long-generated-view': {
                                    'type': no.L.ASYNC,
                                    'views': {}
                                }
                            }
                        },
                        'right': {
                            'type': no.L.BOX,
                            'views': {}
                        },
                        'footer': {
                            'type': no.L.VIEW,
                            'views': {}
                        }
                    }
                }
            });
        });

        it('async view in box', function() {
            ns.layout.define('async2', {
                'app left@': {
                    'regular-view': {
                        'async-view&': true
                    }
                }
            }, 'app');

            expect( no.layout.page('async2') ).to.eql({
                'app': {
                    'type': no.L.VIEW,
                    'views': {
                        'header': {
                            'type': no.L.VIEW,
                            'views': {}
                        },
                        'left': {
                            'type': no.L.BOX,
                            'views': {
                                'regular-view': {
                                    'type': no.L.VIEW,
                                    'views': {
                                        'async-view': {
                                            'type': no.L.ASYNC,
                                            'views': {}
                                        }
                                    }
                                }
                            }
                        },
                        'right': {
                            'type': no.L.BOX,
                            'views': {}
                        },
                        'footer': {
                            'type': no.L.VIEW,
                            'views': {}
                        }
                    }
                }
            });
        });
    });

    describe('dynamic layouts', function() {

        it('setup', function() {

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


            expect( no.layout.page('setup', { tab: 'interface' }) ).to.eql({
                'app': {
                    'type': no.L.VIEW,
                    'views': {
                        'header': {
                            'type': no.L.VIEW,
                            'views': {}
                        },
                        'left': {
                            'type': no.L.BOX,
                            'views': {
                                'setup-menu': {
                                    'type': no.L.VIEW,
                                    'views': {}
                                }
                            }
                        },
                        'right': {
                            'type': no.L.BOX,
                            'views': {
                                'setup-interface': {
                                    'type': no.L.VIEW,
                                    'views': {
                                        'content': {
                                            'type': no.L.BOX,
                                            'views': {
                                                'setup-submenu': {
                                                    'type': no.L.VIEW,
                                                    'views': {}
                                                },
                                                'setup-blocks': {
                                                    'type': no.L.VIEW,
                                                    'views': {}
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        'footer': {
                            'type': no.L.VIEW,
                            'views': {}
                        }
                    }
                }
            });
        });

        it('setup-filters', function() {

            ns.layout.define('setup-filters', {
                'app right@ setup-{ .tab } content@': {
                    'setup-blocks': true
                }
            }, 'setup');

            expect( no.layout.page('setup-filters', { tab: 'filters' }) ).to.eql({
                'app': {
                    'type': no.L.VIEW,
                    'views': {
                        'header': {
                            'type': no.L.VIEW,
                            'views': {}
                        },
                        'left': {
                            'type': no.L.BOX,
                            'views': {
                                'setup-menu': {
                                    'type': no.L.VIEW,
                                    'views': {}
                                }
                            }
                        },
                        'right': {
                            'type': no.L.BOX,
                            'views': {
                                'setup-filters': {
                                    'type': no.L.VIEW,
                                    'views': {
                                        'content': {
                                            'type': no.L.BOX,
                                            'views': {
                                                'setup-blocks': {
                                                    'type': no.L.VIEW,
                                                    'views': {}
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        'footer': {
                            'type': no.L.VIEW,
                            'views': {}
                        }
                    }
                }
            });
        });


        it('choose box from params', function() {

            ns.layout.define('message', {
                'app right@': function(params) {
                    return (params.ids) ? 'message' : 'messages';
                }
            }, 'mailbox');

            expect( no.layout.page('message', { ids: "1234567890" }) ).to.eql({
                'app': {
                    'type': no.L.VIEW,
                    'views': {
                        'header': {
                            'type': no.L.VIEW,
                            'views': {}
                        },
                        'left': {
                            'type': no.L.BOX,
                            'views': {
                                'folders': {
                                    'type': no.L.VIEW,
                                    'views': {}
                                },
                                'labels': {
                                    'type': no.L.VIEW,
                                    'views': {}
                                }
                            }
                        },
                        'right': {
                            'type': no.L.BOX,
                            'views': {
                                'message': {
                                    'type': no.L.VIEW,
                                    'views': {}
                                }
                            }
                        },
                        'footer': {
                            'type': no.L.VIEW,
                            'views': {}
                        }
                    }
                }
            });

            expect( no.layout.page('message', { current_folder: "9876543210" }) ).to.eql({
                'app': {
                    'type': no.L.VIEW,
                    'views': {
                        'header': {
                            'type': no.L.VIEW,
                            'views': {}
                        },
                        'left': {
                            'type': no.L.BOX,
                            'views': {
                                'folders': {
                                    'type': no.L.VIEW,
                                    'views': {}
                                },
                                'labels': {
                                    'type': no.L.VIEW,
                                    'views': {}
                                }
                            }
                        },
                        'right': {
                            'type': no.L.BOX,
                            'views': {
                                'messages': {
                                    'type': no.L.VIEW,
                                    'views': {}
                                }
                            }
                        },
                        'footer': {
                            'type': no.L.VIEW,
                            'views': {}
                        }
                    }
                }
            });
        });

    });

});

