NPM_BIN=$(CURDIR)/node_modules/.bin
export NPM_BIN

yate: test/tests.yate.js

test/tests.yate.js: test/tests.yate
	node_modules/.bin/yate test/tests.yate > test/tests.yate.js

node_modules: package.json
	npm install
	touch node_modules

clean-node_modules:
	rm -rf node_modules

grunt: node_modules yate
	$(NPM_BIN)/grunt

.PHONY: clean-node_modules grunt yate
