no.layout.define('index', {
    '@app': {
        'index': true
    }
});

no.layout.define('view-album', {
    '@app': {
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
    '@app': {
        'user': {
            '@left': {
                'profile': true,
                'recent-photos': true
            },
            '@right': {
                'photo': {
                    'photo-image': true,
                    '@comments': {
                        'photo-comments': true
                    }
                }
            }
        }
    }
});

