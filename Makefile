export NPM_BIN=$(CURDIR)/node_modules/.bin

# сборка для npm
dist: build/*.js src/*.js | node_modules
	mkdir -p dist
	$(NPM_BIN)/borschik -i build/src.client.js -o dist/noscript.js -m no
	$(NPM_BIN)/borschik -i build/src.client.js -o dist/noscript.min.js -m yes
	$(NPM_BIN)/borschik -i build/src.server.js -o dist/noscript.module.js -m no
	touch dist

node_modules: package.json
	npm install
	touch node_modules

# Тесты
.PHONY: test test-jshint test-node test-karma yate
test:
	$(MAKE) test-jshint
	$(MAKE) test-karma test-node

test-jshint: dist | node_modules
	$(NPM_BIN)/jshint src
	$(NPM_BIN)/jscs src

test-node: dist yate | node_modules
	$(NPM_BIN)/mocha test/node

test-karma: dist yate | node_modules
	./node_modules/karma/bin/karma start

yate: test/tests.yate.js

test/tests.yate.js: test/tests.yate yate/noscript.yate | node_modules
	$(NPM_BIN)/yate $< > $@

# публикация npm
npm-publish: dist
	npm publish

gh-pages:
	git clone -b gh-pages --reference ./ git@github.com:yandex-ui/noscript.git gh-pages

jsdoc: gh-pages
	$(MAKE) -C gh-pages

jsdoc-publish: gh-pages
	$(MAKE) -C gh-pages publish
