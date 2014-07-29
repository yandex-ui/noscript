/* borschik:include:../node_modules/vow/lib/vow.js */
/* borschik:include:../src/vow.log.js */
(function(window, document) {
    "use strict";
    /* borschik:include:../node_modules/nommon/lib/no.base.js */
    /* borschik:include:../node_modules/nommon/lib/no.parser.js */
    /* borschik:include:../node_modules/nommon/lib/no.jpath.js */

    /* borschik:include:../src/ns.js */
    /* borschik:include:../src/ns.consts.js */
    /* borschik:include:../src/ns.consts.events.js */
    /* borschik:include:../src/ns.consts.client.js */
    /* borschik:include:../src/ns.dom.js */
    /* borschik:include:../src/ns.entityify.js */
    /* borschik:include:../src/ns.events.js */
    /* borschik:include:../src/ns.history.js */
    /* borschik:include:../src/ns.http.client.js */
    /* borschik:include:../src/ns.object.js */
    /* borschik:include:../src/ns.profile.js */

    /* borschik:include:../src/ns.action.js */
    /* borschik:include:../src/ns.model.js */
    /* borschik:include:../src/ns.modelCollection.js */
    /* borschik:include:../src/ns.layout.js */
    /* borschik:include:../src/ns.log.js */
    /* borschik:include:../src/ns.page.js */
    /* borschik:include:../src/ns.page.block.js */
    /* borschik:include:../src/ns.page.history.js */
    /* borschik:include:../src/ns.request.js */
    /* borschik:include:../src/ns.router.js */
    /* borschik:include:../src/ns.update.js */
    /* borschik:include:../src/ns.view.js */
    /* borschik:include:../src/ns.viewCollection.js */

    // ns.box должен подключаться после ns.view, т.к. берет методы из него
    /* borschik:include:../src/ns.box.js */

    window.no = no;
    window.ns = ns;
})(window, document);
