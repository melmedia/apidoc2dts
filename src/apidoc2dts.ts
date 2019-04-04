import 'source-map-support/register';
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
import * as ejs from 'ejs';
import lodashSet = require('lodash.set');
/* tslint:disable-next-line:import-name */
import lodashGroupBy = require('lodash.groupby');
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
  parameter: {
    fields: {
      Parameter: ApiField[];
      'Route params': ApiField[];
      [group: string]: ApiField[];
    },
  };
  success: {
    fields: {
      'Success 200': ApiField[];
      201: ApiField[];
      204: ApiField[];
      400: ApiField[];
      403: ApiField[];
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
    let types: { [type: string]: { [field: string]: ApiField } } = { [topLevelTypeName]: {} };

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
    const apiRenderData = api.filter(handler =>
        this.isRenderRequest(handler) || this.isRenderResponse(handler))
      .map((handler) => {
        const request = this.isRenderRequest(handler)
          ? Apidoc2DTS.types(
              Apidoc2DTS.nestedFields(handler.parameter.fields.Parameter),
              `${handler.name}Params`,
            )
          : undefined;
        const response = this.isRenderResponse(handler)
          ? Apidoc2DTS.types(
              Apidoc2DTS.nestedFields(handler.success.fields['Success 200']),
              handler.name,
            )
          : undefined;
        return {
          ...handler,
          request,
          response,
        };
      });

    const apiRenderDataServices = lodashGroupBy(
      apiRenderData,
      handler => handler.group.split('_').join('.'),
    );
    // console.log(JSON.stringify(apiRenderDataServices));

    console.log(
      await (ejs.renderFile as any)(
        './views/dts.ejs',
        { moduleName: apiProject.name, api: apiRenderDataServices } as ejs.Data,
      ),
    );

  }

  protected isRenderRequest(handler: ApiHandler) {
    return handler.parameter
      && handler.parameter.fields
      && handler.parameter.fields.Parameter;
  }

  protected isRenderResponse(handler: ApiHandler) {
    return 'GET' === handler.type
      && handler.success
      && handler.success.fields
      && handler.success.fields['Success 200'];
  }

}

const apidocFolder = process.argv[2];
if (!apidocFolder) {
  throw new Error('Must specify apidoc folder: node dist/apidoc2dts.js ../apidoc/');
}
new Apidoc2DTS().apidoc2dts(apidocFolder);
