NPM_ROOT=$(CURDIR)/node_modules
NPM_BIN=$(CURDIR)/node_modules/.bin
export NPM_BIN

jsdoc: node_modules single-page-doc
	$(NPM_BIN)/jsdoc -c jsdoc.json -d .

single-page-doc:
	rm -rf single-page
	mkdir single-page
	cp -r $(NPM_ROOT)/node-doc-generator/assets single-page/
	node $(NPM_ROOT)/node-doc-generator/generate.js --format=html --template=../doc/single-page-doc.html ../doc/index.md > single-page/index.html

publish: jsdoc
	git add -A
	git commit -m 'publish jsdoc'
	git push

node_modules: package.json
	npm install
	touch node_modules

.PHONY: jsdoc publish single-page-doc
