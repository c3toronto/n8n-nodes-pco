import {
	IExecuteFunctions,
	IDataObject,
	IHttpRequestMethods,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

const MAX_RETRIES = 3;
const SKIP_STEP_DELAY_MS = 250;

/**
 * Make an authenticated PCO API request with Retry-After handling.
 */
async function pcoRequest(
	context: IExecuteFunctions,
	method: IHttpRequestMethods,
	path: string,
	itemIndex: number,
	body?: object,
): Promise<IDataObject> {
	const credentials = await context.getCredentials('peopleApi', itemIndex);
	const baseUrl = (credentials.url as string).replace(/\/$/, '');

	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		try {
			return await context.helpers.httpRequestWithAuthentication.call(
				context,
				'peopleApi',
				{
					method,
					url: `${baseUrl}${path}`,
					body,
					json: true,
					returnFullResponse: false,
				},
			);
		} catch (error: unknown) {
			const err = error as NodeApiError & {
				httpCode?: string;
				response?: { headers?: Record<string, string> };
			};
			if (err.httpCode === '429' && attempt < MAX_RETRIES - 1) {
				const retryAfter = parseInt(
					err.response?.headers?.['retry-after'] ?? '5',
					10,
				);
				await new Promise((r) => setTimeout(r, retryAfter * 1000));
				continue;
			}
			throw error;
		}
	}
	throw new NodeApiError(context.getNode(), { message: 'Max retries exceeded' });
}

export class pcoWorkflowActions implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PCO Workflow Actions',
		name: 'pcoWorkflowActions',
		icon: 'file:logo.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Perform actions on Planning Center workflow cards (skip, promote, go back)',
		defaults: {
			name: 'PCO Workflow Actions',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'peopleApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Skip Step',
						value: 'skip_step',
						description: 'Skip the current step on a workflow card',
						action: 'Skip step on a workflow card',
					},
					{
						name: 'Promote',
						value: 'promote',
						description: 'Complete the current step and advance the card',
						action: 'Promote a workflow card',
					},
					{
						name: 'Go Back',
						value: 'go_back',
						description: 'Move a workflow card back one step',
						action: 'Go back on a workflow card',
					},
					{
						name: 'Skip to Step',
						value: 'skip_to_step',
						description: 'Skip forward repeatedly until reaching a target step',
						action: 'Skip to a specific step on a workflow card',
					},
				],
				default: 'skip_step',
			},
			{
				displayName: 'Person ID',
				name: 'person_id',
				type: 'string',
				required: true,
				default: '',
				description: 'The PCO Person ID',
			},
			{
				displayName: 'Workflow Card ID',
				name: 'workflow_card_id',
				type: 'string',
				required: true,
				default: '',
				description: 'The workflow card ID to act on',
			},
			{
				displayName: 'Target Step ID',
				name: 'target_step_id',
				type: 'string',
				required: true,
				default: '',
				description: 'The step ID to skip forward to',
				displayOptions: {
					show: {
						operation: ['skip_to_step'],
					},
				},
			},
			{
				displayName: 'Max Skips',
				name: 'max_skips',
				type: 'number',
				default: 10,
				description: 'Safety limit on the number of skip_step calls',
				displayOptions: {
					show: {
						operation: ['skip_to_step'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const operation = this.getNodeParameter('operation', i) as string;
			const personId = this.getNodeParameter('person_id', i) as string;
			const cardId = this.getNodeParameter('workflow_card_id', i) as string;

			// credential url already includes /people/v2
			const cardPath = `/people/${personId}/workflow_cards/${cardId}`;

			switch (operation) {
				case 'skip_step': {
					const resp = await pcoRequest(
						this, 'POST', `${cardPath}/skip_step`, i,
					);
					returnData.push({ json: resp as IDataObject });
					break;
				}

				case 'promote': {
					const resp = await pcoRequest(
						this, 'POST', `${cardPath}/promote`, i,
					);
					returnData.push({ json: resp as IDataObject });
					break;
				}

				case 'go_back': {
					const resp = await pcoRequest(
						this, 'POST', `${cardPath}/go_back`, i,
					);
					returnData.push({ json: resp as IDataObject });
					break;
				}

				case 'skip_to_step': {
					const targetStepId = this.getNodeParameter('target_step_id', i) as string;
					const maxSkips = this.getNodeParameter('max_skips', i, 10) as number;
					let currentStepId = '';
					let skips = 0;

					while (skips < maxSkips) {
						const resp = await pcoRequest(
							this, 'POST', `${cardPath}/skip_step`, i,
						) as IDataObject;

						const data = resp.data as IDataObject | undefined;
						const relationships = data?.relationships as IDataObject | undefined;
						const currentStep = relationships?.current_step as IDataObject | undefined;
						const stepData = currentStep?.data as IDataObject | undefined;
						currentStepId = (stepData?.id as string) ?? '';
						skips++;

						if (currentStepId === targetStepId) break;
						if (!currentStepId) break; // card completed or no more steps

						await new Promise((r) => setTimeout(r, SKIP_STEP_DELAY_MS));
					}

					returnData.push({
						json: {
							success: currentStepId === targetStepId,
							skips,
							final_step_id: currentStepId,
						},
					});
					break;
				}

				default:
					throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
			}
		}

		return [returnData];
	}
}
