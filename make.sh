#!/bin/bash

cat src/no.js \
    src/array.js \
    src/events.js \
    src/promise.js > noscript-core.js

cat noscript-core.js \
    src/model.js \
    src/request.js \
    src/view.js \
    src/box.js \
    src/layout.js \
    src/router.js \
    src/update.js > noscript.js


