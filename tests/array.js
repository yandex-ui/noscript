include('../src/no/no.js');
include('../src/no/no.array.js');

// ----------------------------------------------------------------------------------------------------------------- //

module("Searching");

test("no.array.grep", function() {
    var result;
    var ar = [ "one", "two", "one", "three" ];

    result = no.array.grep(ar, function(item, index) { return item === "four"; });
    deepEqual(result, [], "If found nothing - return empty array");

    result = no.array.grep(ar, function(item, index) { return item === "one"; });
    deepEqual(result, [ "one", "one" ], "Will find equal items");
});

test("All search methods must use identical predicate functions", function() {
    var ar = [ "one", "two", "three" ];

    // Заглушка метода будет считать вызовы только для определённых наборов агрументов.
    var predicate = sinon.spy();
    predicate.withArgs("one", 0);
    predicate.withArgs("two", 1);
    predicate.withArgs("three", 2);

    no.array.grep(ar, predicate);
    no.array.firstMatch(ar, predicate);

    equals(predicate.withArgs("one", 0).callCount, 2, "First item calls");
    equals(predicate.withArgs("two", 1).callCount, 2, "Second item calls");
    equals(predicate.withArgs("three", 2).callCount, 2, "Third item calls");
});
