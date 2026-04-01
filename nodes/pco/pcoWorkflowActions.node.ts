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
const PROMOTE_DELAY_MS = 250;
const MAX_PROMOTES = 5;

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
		description: 'Perform actions on Planning Center workflow cards (skip, promote, go back, get cards)',
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
						name: 'Get Cards',
						value: 'get_cards',
						description: 'Get active workflow cards, optionally filtered by step',
						action: 'Get workflow cards',
					},
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
				default: 'get_cards',
			},
			// --- get_cards parameters ---
			{
				displayName: 'Workflow IDs',
				name: 'workflow_ids',
				type: 'string',
				required: true,
				default: '',
				description: 'Comma-separated PCO workflow IDs to query',
				displayOptions: {
					show: {
						operation: ['get_cards'],
					},
				},
			},
			{
				displayName: 'Step IDs (Filter)',
				name: 'step_ids',
				type: 'string',
				default: '',
				description: 'Comma-separated step IDs to filter by (empty = all active cards)',
				displayOptions: {
					show: {
						operation: ['get_cards'],
					},
				},
			},
			// --- Action parameters (not needed for get_cards) ---
			{
				displayName: 'Person ID',
				name: 'person_id',
				type: 'string',
				required: true,
				default: '',
				description: 'The PCO Person ID',
				displayOptions: {
					show: {
						operation: ['skip_step', 'promote', 'go_back', 'skip_to_step'],
					},
				},
			},
			{
				displayName: 'Workflow Card ID',
				name: 'workflow_card_id',
				type: 'string',
				required: true,
				default: '',
				description: 'The workflow card ID to act on',
				displayOptions: {
					show: {
						operation: ['skip_step', 'promote', 'go_back', 'skip_to_step'],
					},
				},
			},
			// --- promote option ---
			{
				displayName: 'Promote Until Completed',
				name: 'promote_until_completed',
				type: 'boolean',
				default: false,
				description: 'Keep promoting until the card reaches Completed status',
				displayOptions: {
					show: {
						operation: ['promote'],
					},
				},
			},
			// --- skip_to_step parameters ---
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

			switch (operation) {
				case 'get_cards': {
					const workflowIdsRaw = this.getNodeParameter('workflow_ids', i) as string;
					const stepIdsRaw = this.getNodeParameter('step_ids', i, '') as string;

					const workflowIds = workflowIdsRaw.split(',').map((s) => s.trim()).filter(Boolean);
					const stepIdSet = new Set(
						stepIdsRaw ? stepIdsRaw.split(',').map((s) => s.trim()).filter(Boolean) : [],
					);

					for (const workflowId of workflowIds) {
						let nextPath: string | null = `/workflows/${workflowId}/cards?include=current_step&per_page=100`;

						while (nextPath) {
							const resp = await pcoRequest(this, 'GET', nextPath, i);
							const cards = (resp.data as IDataObject[]) || [];
							const included = (resp.included as IDataObject[]) || [];

							// Build step name lookup from included data
							const stepNames = new Map<string, string>();
							for (const inc of included) {
								if ((inc.type as string) === 'WorkflowStep') {
									const attrs = inc.attributes as IDataObject;
									stepNames.set(inc.id as string, attrs.name as string);
								}
							}

							for (const card of cards) {
								const attrs = card.attributes as IDataObject;
								if (attrs.completed_at || attrs.removed_at) continue;

								const relationships = card.relationships as IDataObject;
								const currentStep = relationships?.current_step as IDataObject;
								const stepData = currentStep?.data as IDataObject;
								const stepId = stepData?.id as string;

								if (stepIdSet.size > 0 && !stepIdSet.has(stepId)) continue;

								const person = relationships?.person as IDataObject;
								const personData = person?.data as IDataObject;

								returnData.push({
									json: {
										card_id: card.id as string,
										person_id: personData?.id as string,
										workflow_id: workflowId,
										step_id: stepId,
										step_name: stepNames.get(stepId) || '',
										moved_to_step_at: attrs.moved_to_step_at as string,
									},
								});
							}

							// Handle pagination
							const links = resp.links as IDataObject;
							const nextUrl = links?.next as string | undefined;
							if (nextUrl) {
								// Extract path from full URL
								const url = new URL(nextUrl);
								nextPath = url.pathname.replace('/people/v2', '') + url.search;
							} else {
								nextPath = null;
							}
						}
					}

					// No sentinel item — empty output means downstream nodes won't execute
					break;
				}

				case 'skip_step': {
					const personId = this.getNodeParameter('person_id', i) as string;
					const cardId = this.getNodeParameter('workflow_card_id', i) as string;
					const cardPath = `/people/${personId}/workflow_cards/${cardId}`;

					const resp = await pcoRequest(
						this, 'POST', `${cardPath}/skip_step`, i,
					);
					returnData.push({ json: resp as IDataObject });
					break;
				}

				case 'promote': {
					const personId = this.getNodeParameter('person_id', i) as string;
					const cardId = this.getNodeParameter('workflow_card_id', i) as string;
					const untilCompleted = this.getNodeParameter('promote_until_completed', i, false) as boolean;
					const cardPath = `/people/${personId}/workflow_cards/${cardId}`;

					if (!untilCompleted) {
						const resp = await pcoRequest(
							this, 'POST', `${cardPath}/promote`, i,
						);
						returnData.push({ json: resp as IDataObject });
					} else {
						let completed = false;
						let promotes = 0;
						let lastResp: IDataObject = {};

						while (!completed && promotes < MAX_PROMOTES) {
							lastResp = await pcoRequest(
								this, 'POST', `${cardPath}/promote`, i,
							);
							promotes++;

							const data = lastResp.data as IDataObject | undefined;
							const attrs = data?.attributes as IDataObject | undefined;
							completed = !!attrs?.completed_at;

							if (!completed && promotes < MAX_PROMOTES) {
								await new Promise((r) => setTimeout(r, PROMOTE_DELAY_MS));
							}
						}

						returnData.push({
							json: {
								completed,
								promotes,
								card_id: cardId,
								person_id: personId,
							},
						});
					}
					break;
				}

				case 'go_back': {
					const personId = this.getNodeParameter('person_id', i) as string;
					const cardId = this.getNodeParameter('workflow_card_id', i) as string;
					const cardPath = `/people/${personId}/workflow_cards/${cardId}`;

					const resp = await pcoRequest(
						this, 'POST', `${cardPath}/go_back`, i,
					);
					returnData.push({ json: resp as IDataObject });
					break;
				}

				case 'skip_to_step': {
					const personId = this.getNodeParameter('person_id', i) as string;
					const cardId = this.getNodeParameter('workflow_card_id', i) as string;
					const targetStepId = this.getNodeParameter('target_step_id', i) as string;
					const maxSkips = this.getNodeParameter('max_skips', i, 10) as number;
					const cardPath = `/people/${personId}/workflow_cards/${cardId}`;

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
