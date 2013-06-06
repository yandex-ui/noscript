NPM_BIN=$(CURDIR)/node_modules/.bin
export NPM_BIN

node_modules: package.json
	npm install --registry http://npm.yandex-team.ru
	touch node_modules

clean-node_modules:
	rm -rf node_modules

grunt:
	$(NPM_BIN)/grunt

.PHONY: clean-node_modules grunt
