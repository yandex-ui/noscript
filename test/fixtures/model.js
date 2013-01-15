no.Model.define('m0');

no.Model.define('m1', {
    params: {
        p1: null,
        p2: 2,
        p3: null,
        p4: 'foo'
    }
});

no.Model.define('do-m1', {
    params: {
        p1: null,
        p2: null
    }
});

no.Model.define('split1', {
    params: {
        p1: null,
        p2: null
    },
    split: { // условное название
        items: '.item', // jpath, описывающий что именно выбирать.
        id: '.id', // jpath, описывающий как для каждого item'а вычислить его id.
        params: { // это расширенный jpath, конструирующий новый объект.
            id: '.id',
            foo: '.value'
        },
        model_id: 'split1-item'
    }
});

no.Model.define('split1-item', {
    params: {
        id: null,
        foo: null
    }
});
