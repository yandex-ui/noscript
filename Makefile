NPM_BIN=$(CURDIR)/node_modules/.bin
export NPM_BIN

jsdoc: node_modules
	$(NPM_BIN)/jsdoc -c jsdoc.json -d .

publish: jsdoc
	git add -A
	git commit -m 'publish jsdoc'
	git push

node_modules: package.json
	npm install
	touch node_modules

.PHONY: jsdoc publish
