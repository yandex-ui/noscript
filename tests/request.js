include('../src/no/no.js');
include('../src/no/no.object.js');
include('../src/no/no.http.js');
include('../src/no/no.promise.js');
include('../src/no/no.events.js');
include('../src/no/no.model.js');
include('../src/no/no.request.js');

no.Model.register('viewProfile', {
    params: {
        authorId: null
    }
}, no.Model);

no.Model.register('getImage', {
    params: {
        authorId: null,
        imageId: null,
        onlyPublic: null
    }
}, no.Model);

no.request([
    {
        model_id: 'viewProfile',
        params: {
            authorId: '18898957'
        }
    },
    {
        model_id: 'getImage',
        params: {
            authorId: '18898957',
            imageId: 27141,
            onlyPublic: false
        }
    },
    {
        model_id: 'getImage',
        params: {
            authorId: '18898957',
            imageId: 27142,
            onlyPublic: false
        }
    }
]).promise().then(function() {
    console.log(1);
    console.log( JSON.stringify( no.object.keys( no.Model.get('getImage')._cache ) ) );
});

no.request([
    {
        model_id: 'viewProfile',
        params: {
            authorId: '18898957'
        }
    },
    {
        model_id: 'getImage',
        params: {
            authorId: '18898957',
            imageId: 27142,
            onlyPublic: false
        }
    },
    {
        model_id: 'getImage',
        params: {
            authorId: '18898957',
            imageId: 27143,
            onlyPublic: false
        }
    }
]).promise().then(function() {
    console.log(2);
    console.log( JSON.stringify( no.object.keys( no.Model.get('getImage')._cache ) ) );
});

