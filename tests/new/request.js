// For jshint.
/*global no: true, module: true, test: true, ok: true, raises: true */

include('../../src/no/no.js');
include('../../src/no/no.promise.js');
include('../../src/no/no.js');
include('../../src/no/no.object.js');
include('../../src/no/no.http.js');
include('../../src/no/no.promise.js');
include('../../src/no/no.model.js');

include('../../src/no/no.request.js');

// ----------------------------------------------------------------------------------------------------------------- //

module("Basic functionality");

test("Creation", function() {
    // Empty constructor.
    raises(function() { no.request(); }, /length/, "User must specify items");
});

test("Create request with a model with no parameters", function() {
    // Register model.
    var model;
    var id = "test_model";
    var type_info = { params: {} };
    var create = function(model_id, type_info) {}
    no.Model.register(id, type_info, create);

    // Create request.
    var request;
    request = no.request([
        { model_id: id, params: {} }
    ]);
    ok(request, "Request with params = null created");
});
