var Promise = require('../promise.js');

// require('vows'); // Оно доопределяет много чего в модуле assert.
var assert = require('assert');

module.exports = {

    "Сперва p.then, затем p.resolve": function() {
        var p = new Promise();
        p.then(function(r) {
            assert.equal(r, 42);
        });
        p.resolve(42);
    },

    "Сперва p.then, затем асинхронный p.resolve": function(exit) {
        var p = new Promise();
        p.then(function(r) {
            exit(function() {
                assert.equal(r, 42);
            });
        });
        setTimeout(function() {
            p.resolve(42);
        }, 100);
    },

    "Сперва p.resolve, затем p.then": function() {
        var p = new Promise();
        p.resolve(42);
        p.then(function(r) {
            assert.equal(r, 42);
        });
    },

    "Во все callback'и, добавленные через p.then, приходит одно и тоже": function() {
        var p = new Promise();
        p.then(function(r) {
            assert.equal(r, 42);
        }).then(function(r) {
            assert.equal(r, 42);
        });
        p.resolve(42);
    },

    "callback'и выполняются в порядке добавления": function() {
        var p = new Promise();
        var a = [];
        p.then(function() {
            a.push(42);
        }).then(function() {
            a.push(77);
        });
        p.resolve();
        assert.eql(a, [42, 77]);
    },

    "Второй p.resolve не переопределяет результат первого": function() {
        var p = new Promise();
        p.resolve(42);
        p.resolve(77);
        p.then(function(r) {
            assert.equal(r, 42);
        });
    },

    "После p.reject не срабатывает p.resolve и не вызываются callback'и": function() {
        var p = new Promise();
        var a;
        p.then(function(r) {
            a = r; // Чтобы убедиться, что callback не вызывался, сохраняем результат в переменную.
        });
        p.reject(42);
        p.resolve(77);
        assert.notEqual(p.resolve, 77);
        assert.strictEqual(a, undefined);
    },

    "Сперва w.then, затем p.resolve и q.resolve": function() {

        var p = new Promise();
        var q = new Promise();
        var w = Promise.wait([ p, q ]);

        w.then(function(r) {
            assert.eql(r, [42, 24]);
        });

        p.resolve(42);
        q.resolve(24);
    },

    "Сперва w.then, затем q.resolve и p.resolve": function() {

        var p = new Promise();
        var q = new Promise();
        var w = Promise.wait([ p, q ]);

        w.then(function(r) {
            assert.eql(r, [42, 24]);
        });

        q.resolve(24);
        p.resolve(42);
    },

    "Сперва w.then, затем ассинхронные p.resolve и q.resolve": function(exit) {

        var p = new Promise();
        var q = new Promise();
        var w = Promise.wait([ p, q ]);

        w.then(function(r) {
            exit(function() {
                assert.eql(r, [42, 24]);
            });
        });

        setTimeout(function() {
            p.resolve(42);
        }, 100);

        setTimeout(function() {
            q.resolve(24);
        }, 200);
    }

};

