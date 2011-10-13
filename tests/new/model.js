// For jshint.
/*global no: true, module: true, test: true, ok: true */

include('../../src/no/no.js');
include('../../src/no/no.promise.js');
include('../../src/no/no.js');
include('../../src/no/no.object.js');
include('../../src/no/no.http.js');
include('../../src/no/no.promise.js');

include('../../src/no/no.model.js');

// ----------------------------------------------------------------------------------------------------------------- //

module("Register");

test("Model with no parameters", function() {
    var model;
    var id = "test_model";
    var type_info = { params: null };
    var create = function(model_id, type_info) {}

    no.Model.register(id, type_info, create);
    model = no.Model.get(id);

    ok(model, "Model created");
});
