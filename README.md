# apidoc2dts

[APIDOC](http://apidocjs.com) to Typescript Definition file convertor.

## Installing
```
npm install apidoc2dts
```

## Usage

Generate APIDOC and make sure `api_data.json`, `api_project.json` exists in PATH_TO_APIDOC folder.

Usage:
```
./node_modules/.bin/apidoc2dts PATH_TO_APIDOC > TARGET_FOLDER/index.d.ts
```

How to use generated types:
```
import { YourApidocGroupNamespace } from 'YOUR_PACKAGE_NAME-types';
```
Where `YOUR_PACKAGE_NAME` come from apidoc.json `name` field,
`YourApidocGroupNamespace` come from @apiGroup tags.

Typescript interfaces generated only for:
* `Parameter` @apiParam group (this is default group)
* `@api {GET}` method and `Success 200` @apiSuccess group (this is default group)

You can optionally use [tsfmt](https://github.com/vvakame/typescript-formatter)
to format typescript definition file using your project style guide:
```
./node_modules/.bin/apidoc2dts PATH_TO_APIDOC/ | ./node_modules/.bin/tsfmt --stdin > TARGET_FOLDER/index.d.ts
```


## Example

Example APIDOC:
```
  /**
   * @api {POST} /token Create authentication token for user
   * @apiName Create
   * @apiGroup AdminUser.Token
   *
   * @apiParam {Object} token
   * @apiParam {Number} .userId
   *
   * @apiSuccess (201) {String} Location HTTP header with url for created resource
   * @apiSuccess (201) {Object} token
   * @apiSuccess (201) {String} token.id
   */

  /**
   * @api {GET} /token/:id Get token
   * @apiName Get
   * @apiGroup AdminUser.Token
   *
   * @apiParam (Route params) {String} id
   *
   * @apiSuccess {Object} token
   * @apiSuccess {String} .id
   * @apiSuccess {Number} .userId
   */
```

apidoc2dts will generate:
```typescript
declare module 'apidoc2dts-test-types' {

  namespace AdminUser.Token {

    interface CreateParams {
      token: CreateParams_Token;
    }

    interface CreateParams_Token {
      userId: number;
    }

    interface Get {
      token: Get_Token;
    }

    interface Get_Token {
      id: string;
      userId: number;
    }

  }

}
```
