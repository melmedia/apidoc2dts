# APIDOC to Typescript Definition file convertor

Generate APIDOC and make sure `api_data.json`, `api_project.json` exists in apidoc folder.

Usage:
```
yarn install
yarn build
node dist/apidoc2dts.js PATH_TO_APIDOC/ | ./node_modules/.bin/tsfmt --stdin > ~/TARGET_FOLDER/index.d.ts
```

How to use generated types:
```
import { YourApidocGroupNamespace } from 'your-package-types';
```
Where `your-package` come from apidoc.json `name` field,
`YourApidocGroupNamespace` come from @apiGroup tags.
