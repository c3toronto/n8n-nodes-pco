import {INodeType, INodeTypeDescription, NodeConnectionType} from 'n8n-workflow';
import {N8NPropertiesBuilder, N8NPropertiesBuilderConfig} from '@devlikeapro/n8n-openapi-node';
import * as doc from './openapi_people.json'; // <=== Your OpenAPI v3 spec

const config: N8NPropertiesBuilderConfig = {}
const parser = new N8NPropertiesBuilder(doc, config);
const properties = parser.build()

export class people implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Planning Center People',
    name: 'people',
    icon: 'file:logo.svg',
    group: ['transform'],
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
        'Authorization': '={{ "Basic " + Buffer.from($credentials.username + ":" + $credentials.password).toString("base64") }}',
      },
      baseURL: '={{$credentials.url}}',
    },
    properties: properties, // <==== HERE
  };
}
