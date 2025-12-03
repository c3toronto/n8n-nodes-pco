import {
  INodeType,
  INodeTypeDescription,
  NodeConnectionType,
} from 'n8n-workflow';
import {N8NPropertiesBuilder, N8NPropertiesBuilderConfig} from '@devlikeapro/n8n-openapi-node';
import * as doc from './openapi_people.json'; // <=== Your OpenAPI v3 spec

const config: N8NPropertiesBuilderConfig = {}
const parser = new N8NPropertiesBuilder(doc, config);
let properties = parser.build()

// Fix: Convert operation names in displayOptions to match operation values
// The builder generates operation values with dashes (e.g., 'GET -forms--form-id-')
// but displayOptions still reference the original format (e.g., 'GET /forms/{form_id}')
const operationMap = new Map<string, string>();

// Build a map of original operation names to their converted values
properties.forEach((prop: any) => {
  if (prop.name === 'operation' && prop.options) {
    prop.options.forEach((opt: any) => {
      if (opt.name && opt.value) {
        operationMap.set(opt.name, opt.value);
      }
    });
  }
});

// Fix all displayOptions to use the converted operation values
properties = properties.map((prop: any) => {
  if (prop.displayOptions?.show?.operation) {
    prop.displayOptions.show.operation = prop.displayOptions.show.operation.map(
      (opName: string) => operationMap.get(opName) || opName
    );
  }
  return prop;
});

// Group optional query parameters under "Additional Fields"
// Required path parameters (like form_id) stay as individual fields
const groupedProperties: any[] = [];
const additionalFieldsByOperation = new Map<string, any[]>();

properties.forEach((prop: any) => {
  // Keep these as-is
  if (prop.name === 'resource' || prop.name === 'operation' || prop.type === 'notice') {
    groupedProperties.push(prop);
    return;
  }

  // Required path parameters (not query params) stay as individual fields
  const isPathParam = prop.required && !prop.name.includes('[') && !prop.name.includes('where');
  if (isPathParam) {
    groupedProperties.push(prop);
    return;
  }

  // Group everything else into "Additional Fields"
  const operations = prop.displayOptions?.show?.operation || [];
  operations.forEach((op: string) => {
    if (!additionalFieldsByOperation.has(op)) {
      additionalFieldsByOperation.set(op, []);
    }
    // Remove displayOptions from the grouped field
    const fieldCopy = { ...prop };
    delete fieldCopy.displayOptions;
    additionalFieldsByOperation.get(op)!.push(fieldCopy);
  });
});

// Create "Additional Fields" collection for each operation
additionalFieldsByOperation.forEach((fields, operation) => {
  if (fields.length > 0) {
    groupedProperties.push({
      displayName: 'Additional Fields',
      name: 'additionalFields',
      type: 'collection',
      placeholder: 'Add Field',
      default: {},
      displayOptions: {
        show: {
          operation: [operation],
        },
      },
      options: fields,
    });
  }
});

properties = groupedProperties;

export class people implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Planning Center People',
    name: 'people',
    icon: 'file:logo.svg',
    group: [],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Interact with Planning Center People API',
    defaults: {
      name: 'Planning Center People',
    },
    inputs: [NodeConnectionType.Main],
    outputs: [NodeConnectionType.Main],
    credentials: [
      {
        name: 'peopleApi',
        required: true,
      },
    ],
    requestDefaults: {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      baseURL: '={{$credentials.url}}',
    },
    properties: properties, // <==== HERE
  };
}
