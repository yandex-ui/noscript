no.layout.define('index', {
    '@layout': {
        'index': true
    }
});

no.layout.define('view-album', {
    '@layout': {
        'user': {
            '@left': {
                'profile': true
            },
            '@right': {
                'album': true
            }
        }
    }
});

no.layout.define('view-photo', {
    '@layout': {
        'user': {
            '@left': {
                'profile': true,
                'recent-photos': true
            },
            '@right': {
                'photo': {
                    'photo-image': true,
                    '@comments': {
                        'photo-comments': false
                    }
                }
            }
        }
    }
});

