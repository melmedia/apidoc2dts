# APIDOC to Typescript Definition file convertor

Generate APIDOC and make sure `api_data.json`, `api_project.json` exists in apidoc folder.

Usage:
```
yarn install
yarn build
node dist/apidoc2dts.js PATH_TO_APIDOC/ | ./node_modules/.bin/tsfmt --stdin > ~/TARGET_FOLDER/index.d.ts
```
