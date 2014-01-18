NPM_BIN=$(CURDIR)/node_modules/.bin
export NPM_BIN

yate: test/tests.yate.js

test/tests.yate.js: test/tests.yate
	$(NPM_BIN)//yate test/tests.yate > test/tests.yate.js

node_modules: package.json
	npm install
	touch node_modules

clean-node_modules:
	rm -rf node_modules

grunt: node_modules yate
	$(NPM_BIN)/grunt

test: grunt
	$(NPM_BIN)/jscs .

.PHONY: clean-node_modules grunt yate test
