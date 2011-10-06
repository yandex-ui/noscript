include('../src/no/no.js');
include('../src/no/no.debug.js');
include('../src/no/no.promise.js');

var p1 = new no.Promise();
var p2 = new no.Promise();

p1.then( no.debug.log('p1') );
p2.then( no.debug.log('p2') );

no.Promise.wait([ p1, p2 ]).then( no.debug.log('p1&p2') );

p1.resolve(42);
p2.resolve(66);

no.Promise.wait([ p1, p2 ]).then( no.debug.log('p1&p2 again') );

no.Promise.wait([ p1 ]).then( no.debug.log('wait p1') );
