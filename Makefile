NPM_BIN=$(CURDIR)/node_modules/.bin
export NPM_BIN

node_modules: package.json
	npm install
	touch node_modules

clean-node_modules:
	rm -rf node_modules

grunt: node_modules
	$(NPM_BIN)/grunt

.PHONY: clean-node_modules grunt
