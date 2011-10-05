#!/bin/bash

cat src/no/no.js \
    src/no/no.array.js \
    src/no/no.object.js \
    src/no/no.events.js \
    src/no/no.promise.js \
    src/no/no.future.js \
    > nolib-core.js

cat nolib-core.js \
    src/no/no.http.js \
    src/no/no.model.js \
    src/no/no.request.js \
    src/no/no.view.js \
    src/no/no.box.js \
    src/no/no.layout.js \
    src/no/no.router.js \
    src/no/no.update.js \
    > nolib.js

cat nolib-core.js \
    src/de/de.js \
    src/de/de.file.js \
    src/de/de.http.js \
    > delib-core.js

