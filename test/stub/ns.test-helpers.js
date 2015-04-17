/**
 * Helpers for unit testing
 * @namespace
 */
ns.test = {};

/**
 * Включает логирование исключений в консоль.
 * @param {sinon.sandbox} sinon
 */
ns.test.disableExceptionLogger = function(sinon) {
    ns.log.exception.restore();
    // убираем логи из консоли
    sinon.stub(ns.log, 'exception');
};

/**
 * Включает автоответ валидными моделями
 * @param {sinon.sandbox} sinon
 */
ns.test.modelsValidAutorespond = function(sinon) {
    sinon.server.autoRespond = true;
    sinon.server.respond(function(xhr) {
        if (ns.DEBUG) {
            console.log('modelsValidAutorespond', xhr.url);
        }
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

/**
 * Включает автоответ валидными моделями по заданному моку {url: response}
 * @param {sinon.sandbox} sinon
 * @param {object} mock
 */
ns.test.modelsValidAutorespondByMock = function(sinon, mock) {
    sinon.server.autoRespond = true;
    sinon.server.respond(function(xhr) {
        if (ns.DEBUG) {
            console.log('modelsValidAutorespondByMock', xhr.url);
        }
        if (!(xhr.url in mock)) {
            throw new Error('No mock defined for ' + xhr.url);
        }
        xhr.respond(
            200,
            {"Content-Type": "application/json"},
            JSON.stringify(mock[xhr.url])
        );
    });
};
