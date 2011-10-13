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
raises(function() { new no.Request(); }, /length/, "User must specify items");

});
