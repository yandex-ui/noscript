/**
 * Helpers for unit testing
 * @namespace
 */
ns.test = {};

/**
 * Включает автоответ валидными моделями
 * @param {sinon.sandbox} sinon
 */
ns.test.modelsValidAutorespond = function(sinon) {
    sinon.server.autoRespond = true;
    sinon.server.respond(function(xhr) {
        xhr.respond(
            200,
            {"Content-Type": "application/json"},
            JSON.stringify({
                models: [
                    { data: true }
                ]
            })
        );
    });
};
