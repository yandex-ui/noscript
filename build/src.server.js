var Vow = require('vow');
var no = require('nommon');

/* borschik:include:../src/vow.log.js */

/* borschik:include:../src/ns.js */
/* borschik:include:../src/ns.consts.js */
/* borschik:include:../src/ns.entityify.js */
/* borschik:include:../src/ns.events.js */
/* borschik:include:../src/ns.http.server.js */
/* borschik:include:../src/ns.object.js */
/* borschik:include:../src/ns.profile.js */

/* borschik:include:../src/ns.model.js */
/* borschik:include:../src/ns.modelCollection.js */
/* borschik:include:../src/ns.layout.js */
/* borschik:include:../src/ns.log.js */
/* borschik:include:../src/ns.page.js */
/* borschik:include:../src/ns.request.js */
/* borschik:include:../src/ns.router.js */
/* borschik:include:../src/ns.update.js */
/* borschik:include:../src/ns.view.js */
/* borschik:include:../src/ns.viewCollection.js */

// ns.box должен подключаться после ns.view, т.к. берет методы из него
/* borschik:include:../src/ns.box.js */

module.exports = ns;
