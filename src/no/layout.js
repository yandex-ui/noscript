no.layout.define('index', {
    '@content': {
        'index': true
    }
});

no.layout.define('view-album', {
    '@content': {
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
    '@content': {
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

