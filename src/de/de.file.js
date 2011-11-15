// ----------------------------------------------------------------------------------------------------------------- //
// de.file
// ----------------------------------------------------------------------------------------------------------------- //

de.file = {};

// ----------------------------------------------------------------------------------------------------------------- //

de.file._cache = {};

de.file.get = function(filename) {
    var promise = de.file._cache[filename];

    if (!promise) {
        promise = de.file._cache[filename] = new no.Promise();

        node.fs.readFile(filename, function(error, content) {
            if (error) {
                delete de.file._cache[filename]; // Если не удалось считать файл, в следующий раз нужно повторить попытку,
                                                 // а не брать из кэша ошибку.
                promise.reject({
                    'id': 'FILE_OPEN_ERROR',
                    'message': error.message
                });
            } else {
                de.file.watch(filename); // Содержимое файла закэшировано внутри promise'а. Следим, не изменился ли файл.
                promise.resolve(content);
            }

        });
    }

    return promise;
};

no.events.on('file-changed', function(e, filename) { // Файл изменился, выкидываем его из кэша.
    /** @type {string} */ filename;

    delete de.file._cache[ filename ];

    // FIXME: Не нужно ли тут делать еще и unwatch?
});

// ----------------------------------------------------------------------------------------------------------------- //

de.file._watched = {};

de.file.watch = function(filename) {
    if (!de.file._watched[ filename ]) { // FIXME: Непонятно, как это будет жить, когда файлов будет много.
        de.file._watched[ filename ] = true;

        node.fs.watchFile(filename, function (/** @type {{mtime: Date}} */ curr, /** @type {{mtime: Date}} */ prev) {
            if (prev.mtime !== curr.mtime) {
                no.events.trigger('file-changed', filename);
            }
        });
    }
};

de.file.unwatch = function(filename) {
    if (de.file._watched[ filename ]) {
        delete de.file._watched[ filename ];
        node.fs.unwatchFile(filename);
    }
};

