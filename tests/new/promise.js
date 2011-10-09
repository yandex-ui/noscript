module("no.Promise: thens");

test("Then chainability", function() {
    var then = this.spy();
    var else_ = this.spy();

    var p = new no.Promise();
    p.then(then).then(then);
    p.else_(else_).else_(else_);

    p.resolve(42);

    p.then(then).then(then);
    p.else_(else_).else_(else_); // XXX: Bug here too.

    // Tests.
    equals(then.callCount, 4, "Then was called a needed amount of times");
});

// ------------------------------------------------------------------------------------------------------------- //
test("Then is called", function() {
    var resolution_value = { id: 42 };
    var copy = { id: 42 };

    var thens = {
        after: this.spy(),
        before: this.spy(),
    };

    var elses = {
        after: this.spy(),
        before: this.spy(),
    };

    var p = new no.Promise();

    p.then(thens.before);
    p.else_(elses.before);

    p.resolve(resolution_value);

    p.then(thens.after);
    p.else_(elses.after);

    // Tests.
    strictEqual(p.resolved, true, "Resolved flag is set");

    ok(thens.after.calledOnce, "A callback, added after resolution, was called once");
    ok(thens.before.calledOnce, "A callback, added before promise resolution, was called once");
    ok(thens.after.calledWithExactly(copy), "Callback, added after resolution, called with proper value"); // XXX: First bug here.
    ok(thens.before.calledWithExactly(copy), "Callback, added before resolution, called with proper value");

    ok(!elses.after.called, "Else, added after resolution, not called");
    ok(!elses.before.called, "Else, added before resolution, not called");
});

// ------------------------------------------------------------------------------------------------------------- //
// ------------------------------------------------------------------------------------------------------------- //

module("no.Promise: thens");

test("Elses", function() {
    var error = { code: 42 };
    var copy = { code: 42 };

    var thens = {
        after: this.spy(),
        before: this.spy(),
    };

    var elses = {
        after: this.spy(),
        before: this.spy(),
    };

    var p = new no.Promise();

    p.then(thens.before);
    p.else_(elses.before);

    p.reject(error);

    p.then(thens.after);
    p.else_(elses.after);

    // Tests.
    strictEqual(p.rejected, true, "Rejected flag is set");

    ok(elses.after.called, "Else, added after rejection, called once");
    ok(elses.before.called, "Else, added before rejection, called once");
    ok(elses.after.calledWithExactly(copy), "Else, added after rejection, called with proper value");
    ok(elses.before.calledWithExactly(copy), "Else, added before rejection, called with proper value");

    ok(!thens.after.called, "A callback, added after rejection, was not called");
    ok(!thens.before.called, "A callback, added before rejection, was not called");
});

// ------------------------------------------------------------------------------------------------------------- //
test("Then chainability", function() {
    var then = this.spy();
    var else_ = this.spy();

    var p = new no.Promise();
    p.then(then).then(then);
    p.else_(else_).else_(else_);

    p.reject({});

    p.then(then).then(then); // XXX: Bug here too.
    p.else_(else_).else_(else_);

    // Tests.
    equals(then.callCount, 4, "Then was called a needed amount of times");
});
