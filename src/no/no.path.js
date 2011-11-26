no.path = function(path, data, value) {
    var path = new no.Path(path);
    if (value) {
        path.set(data, value);
    } else {
        return path.get(data);
    }
};

no.Path = function(path) {
    this.path = path;
};

no.Path._cache = {};

no.Path._compile = function(path) {
    var compiled = no.Path._cache[path];

    if (!compiled) {
        var parts = path.split('.');

        var body = '';
        for (var i = 0, l = parts.length; i < l; i++) {
            var part = parts[i];
            var r = part.match( /([\w-]+)(\[\d+\])?/ );
            var step = r[1];
            var index = r[2];

            body += 'data = data["' + step + '"]; if (!data) { return; }';
            if (index) {
                body += 'data = data' + index + '; if (!data) { return; }';
            }
        }
        body += 'return data;';

        compiled = no.Path._cache[path] = new Function('data', body);
    }

    return compiled;
};

no.Path.prototype.get = function(obj) {
    var getter = this._getter;
    if (!getter) {
        getter = this._getter = no.Path._compile( this.path );
    }
    return getter(obj);
};

no.Path.prototype.set = function(obj, value) {
    var setter = this._setter;
    if (!setter) {
        var path = this.path;
        var r = /^(.*)(?:\[(\d+)\]|\.([\w-]+))$/.exec(path);
        if (r === null) {
            setter = function(obj, value) {
                obj[path] = value;
            };
        } else {
            var path = new no.Path(r[1]);
            var index = r[2] || r[3];
            setter = function(obj, value) {
                obj = path.get(obj);
                if (obj) {
                    obj[index] = value;
                }
            }
        }
        this._setter = setter;
    }
    setter(obj, value);
};

