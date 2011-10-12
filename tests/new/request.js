module("Basic functionality");

test("Creation", function() {

// Empty constructor.
raises(function() { new no.Request(); }, /length/, "User must specify items");

});
