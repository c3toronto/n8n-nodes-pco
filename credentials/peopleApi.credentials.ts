import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class PeopleApi implements ICredentialType {
	name = 'peopleApi';
	displayName = 'People API';
	properties: INodeProperties[] = [
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
	];
}
