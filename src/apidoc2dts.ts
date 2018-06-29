import 'source-map-support/register';
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
import * as ejs from 'ejs';
import lodashSet = require('lodash.set');
/* tslint:disable-next-line:import-name */
import lodashGroupBy = require('lodash.groupby');
/* tslint:disable-next-line:import-name */
/* tslint:disable-next-line:import-name */
import lodashUpperFirst = require('lodash.upperfirst');
import lodashMerge = require('lodash.merge');

interface ApiField {
  group: string;
  type: string;
  optional: boolean;
  field: string;
  allowedValues?: string[];
}

interface ApiHandler {
  type: string;
  name: string;
  group: string;
  success: {
    fields: {
      [group: string]: ApiField[];
    };
  };
}

type ResponseField = { spec: ApiField };
type ResponseFields = {
  [field: string]: ResponseField | ResponseFields,
};

class Apidoc2DTS {

  protected static nestedFields(fields: ApiField[]) {
    const responseFields: ResponseFields = {};
    let prevTopLevelField: string | undefined;

    for (const field of fields) {
      const fieldNesting = field.field.split('.');

      if (fieldNesting.length > 1) {
        if (!fieldNesting[0]) {
          if (!prevTopLevelField) {
            throw new Error(`For field ${util.format(field)} can't found top level field`);
          }
          fieldNesting[0] = prevTopLevelField;
        }

        lodashSet(responseFields, fieldNesting, { spec: field });
      } else {
        responseFields[field.field] = { spec: field };
        prevTopLevelField = field.field;
      }

    }

    return responseFields;
  }

  protected static types(fields: ResponseFields, topLevelTypeName: string) {
    let types: { [type: string]: { [field: string] : ApiField } } = { [topLevelTypeName]: {} };

    for (const fieldName of Object.keys(fields)) {
      const field = fields[fieldName] as ResponseField;
      if ('Link' === fieldName || 'spec' === fieldName) {
        continue;
      }

      if (!field.spec) {
        /* tslint:disable-next-line:max-line-length */
        throw new Error(`${fieldName} of ${topLevelTypeName} have no APIDOC definition, content is ${util.format(field)}`);
      }

      if (Object.keys(field).length > 1) {  // have 'spec' attribute and some children
        const typeName = `${topLevelTypeName}_${lodashUpperFirst(fieldName)}`;
        types[topLevelTypeName][fieldName] = {
          ...field.spec,
          type: 'Object[]' === field.spec.type ? `${typeName}[]` : typeName,
        };
        types = lodashMerge(types, Apidoc2DTS.types(field as any, typeName));
      } else {
        types[topLevelTypeName][fieldName] = field.spec;
      }
    }

    return types;
  }

  public async apidoc2dts(apidocFolder: string) {
    const fsReadFile = util.promisify(fs.readFile);
    const apiDataFile = path.join(apidocFolder, 'api_data.json');
    const apiProjectFile = path.join(apidocFolder, 'api_project.json');

    const apiProject: { name: string } = JSON.parse(await fsReadFile(apiProjectFile, 'UTF-8'));

    const api: ApiHandler[] = JSON.parse(await fsReadFile(apiDataFile, 'UTF-8'));
    const apiResponses = api.filter(handler => 'GET' === handler.type)
      .filter(handler => handler.success.fields['Success 200'])
      .map(handler =>
        ({
          ...handler,
          response: Apidoc2DTS.types(
            Apidoc2DTS.nestedFields(handler.success.fields['Success 200']),
            handler.name,
          ),
        }));

    const apiServices = lodashGroupBy(
      apiResponses,
      handler => handler.group.split('_').join('.'),
    );
    // console.log(JSON.stringify(apiServices));

    console.log(
      await (ejs.renderFile as any)(
        './views/dts.ejs',
        { moduleName: apiProject.name, api: apiServices } as ejs.Data,
      ),
    );

  }

}

const apidocFolder = process.argv[2];
if (!apidocFolder) {
  throw new Error('Must specify apidoc folder: node dist/apidoc2dts.js ../apidoc/');
}
new Apidoc2DTS().apidoc2dts(apidocFolder);
