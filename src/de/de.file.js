// ----------------------------------------------------------------------------------------------------------------- //
// de.file
// ----------------------------------------------------------------------------------------------------------------- //

de.file = {};

// ----------------------------------------------------------------------------------------------------------------- //

de.file._cache = {};
de.file._watched = {};

// FIXME: Сейчас файл кэшируется навечно, что неправильно.
//        Нужно или кэшировать на некоторое время (5 минут, например),
//        или же следить за изменениями файла.

de.file.get = function(filename) {
    var promise = de.file._cache[filename];

    if (!promise) {
        promise = de.file._cache[filename] = new no.Promise();

        node.fs.readFile(filename, function(error, content) {
            if (error) {
                promise.reject({
                    'id': 'FILE_OPEN_ERROR',
                    'message': error.message
                });
            } else {
                promise.resolve(content);
            }
        });

        if (!de.file._watched[filename]) { // FIXME: Непонятно, как это будет жить, когда файлов будет много.
            de.file._watched[filename] = true;

            // При изменении файла, удаляем его из кэша.
            node.fs.watchFile(filename, function (/** @type {{mtime: Date}} */ curr, /** @type {{mtime: Date}} */ prev) {
                if (curr.mtime !== prev.mtime) {
                    no.events.trigger('file-changed', filename);
                }
            });
        }
    }

    return promise;
};

no.events.bind('file-changed', function(e, filename) {
    /** @type {string} */ filename;

    delete de.file._cache[ filename ];
});

