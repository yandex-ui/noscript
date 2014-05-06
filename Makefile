NPM_BIN=$(CURDIR)/node_modules/.bin
export NPM_BIN

# сборка для тестов и npm
prepare: yate dist

# сборка для npm
dist: node_modules
	mkdir -p dist
	$(NPM_BIN)/borschik -i noscript.borschik.js -o dist/noscript.js -m no
	$(NPM_BIN)/borschik -i noscript.borschik.js -o dist/noscript.min.js -m yes

# сбока yate для тестов
yate: test/tests.yate.js

# публикация npm
npm-publish: dist
	npm publish

test/tests.yate.js: test/tests.yate yate/noscript.yate node_modules
	$(NPM_BIN)/yate $< > $@

node_modules: package.json
	npm install
	touch node_modules

test: node_modules yate
	npm test

gh-pages:
	git clone -b gh-pages git@github.com:yandex-ui/noscript.git gh-pages

jsdoc: gh-pages
	$(MAKE) -C gh-pages

jsdoc-publish: gh-pages
	$(MAKE) -C gh-pages publish

.PHONY: dist jsdoc jsdoc-publish test yate
