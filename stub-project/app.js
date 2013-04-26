ns.router.routes = {
    rewriteUrl: {
        '/reps/noscript/stub-project/': '/'
    },
    route: {
        '/': 'index'
    }
};

// ----------------------------------------------------------------------------------------------------------------- //

var app = {};

//  So u can trigger / listen to in-app events like so: app.trigger() / app.on().
no.extend(app, ns.Events);

app.init = function appInit() {
    ns.init();
    ns.page.go();
};

// ----------------------------------------------------------------------------------------------------------------- //

$(document).ready(function() {
    app.init();
});
