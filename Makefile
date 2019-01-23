all: build/editor.js

sources=$(wildcard js/*.js) $(wildcard js/*/*.js) .babelrc webpack.config.js

.PHONY: watch
watch: node_modules
	node_modules/.bin/webpack --watch

clean:
	rm -rf $(build_dir) node_modules

node_modules: package.json
	npm install

build/editor.js: $(sources) node_modules
	NODE_ENV=production node_modules/.bin/webpack

