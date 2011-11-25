no.path = function(s, dontCache) {
    var path = no.path._cache[s];

    if (!path) {
        path = no.path.compile(s);
        if (!dontCache) {
            no.path._cache[s] = path;
        }
    }

    return path;
}

no.path._cache = {};

no.path.get = function(data, path) {
    no.todo();
};

no.path.set = function(data, path, value) {
    no.todo();
};

no.path.compile = function(path) {
    no.todo();
};

