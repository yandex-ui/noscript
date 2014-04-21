NPM_BIN=$(CURDIR)/node_modules/.bin
export NPM_BIN

yate: test/tests.yate.js

test/tests.yate.js: test/tests.yate
	$(NPM_BIN)/yate test/tests.yate > test/tests.yate.js

node_modules: package.json
	npm install
	touch node_modules

clean-node_modules:
	rm -rf node_modules

grunt: node_modules yate
	$(NPM_BIN)/grunt

test: grunt
	$(NPM_BIN)/jscs .

gh-pages:
	git clone -b gh-pages git@github.com:yandex-ui/noscript.git gh-pages

jsdoc: gh-pages
	$(MAKE) -C gh-pages

jsdoc-publish: gh-pages
	$(MAKE) -C gh-pages publish

.PHONY: clean-node_modules grunt jsdoc jsdoc-publish yate test
