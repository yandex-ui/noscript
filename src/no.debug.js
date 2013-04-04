ns.debug = {};

ns.debug.log = function(s) {
    return function() {
        var args = [].slice.call(arguments);
        if (s) {
            args.unshift(s);
        }
        console.log.apply(console, args);
    };
};

