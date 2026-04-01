import { pcoWorkflowActions } from './pcoWorkflowActions.node';
import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';

/**
 * Create a mock IExecuteFunctions context for testing execute().
 */
function createMockExecuteFunctions(overrides: {
	params?: Record<string, unknown>;
	inputData?: Array<{ json: IDataObject }>;
	httpResponse?: IDataObject;
} = {}): IExecuteFunctions {
	const params = overrides.params ?? {};
	const inputData = overrides.inputData ?? [{ json: {} }];
	const httpResponse = overrides.httpResponse ?? { data: [], included: [], links: {} };

	return {
		getInputData: () => inputData.map((item) => ({ json: item.json, pairedItem: { item: 0 } })),
		getNodeParameter: (name: string, _index: number, fallback?: unknown) =>
			params[name] !== undefined ? params[name] : fallback,
		getCredentials: async () => ({ url: 'https://api.planningcenteronline.com/people/v2' }),
		getNode: () => ({ name: 'test', type: 'test', typeVersion: 1, position: [0, 0], parameters: {} }),
		helpers: {
			httpRequestWithAuthentication: {
				call: async () => httpResponse,
			},
		},
	} as unknown as IExecuteFunctions;
}

describe('pcoWorkflowActions', () => {
	test('smoke: node description is valid', () => {
		const node = new pcoWorkflowActions();
		expect(node.description.properties).toBeDefined();
		expect(node.description.name).toBe('pcoWorkflowActions');
		expect(node.description.credentials).toEqual([
			{ name: 'peopleApi', required: true },
		]);
	});

	test('has all five operations', () => {
		const node = new pcoWorkflowActions();
		const operationProp = node.description.properties.find(
			(p) => p.name === 'operation',
		);
		expect(operationProp).toBeDefined();
		const values = (operationProp as any).options.map(
			(o: any) => o.value,
		);
		expect(values).toEqual([
			'get_cards',
			'skip_step',
			'promote',
			'go_back',
			'skip_to_step',
		]);
	});

	test('get_cards default is selected', () => {
		const node = new pcoWorkflowActions();
		const operationProp = node.description.properties.find(
			(p) => p.name === 'operation',
		);
		expect((operationProp as any).default).toBe('get_cards');
	});

	describe('get_cards parameters', () => {
		test('workflow_ids is required and only shows for get_cards', () => {
			const node = new pcoWorkflowActions();
			const prop = node.description.properties.find(
				(p) => p.name === 'workflow_ids',
			);
			expect(prop).toBeDefined();
			expect(prop?.required).toBe(true);
			expect(prop?.displayOptions).toEqual({
				show: { operation: ['get_cards'] },
			});
		});

		test('step_ids is optional and only shows for get_cards', () => {
			const node = new pcoWorkflowActions();
			const prop = node.description.properties.find(
				(p) => p.name === 'step_ids',
			);
			expect(prop).toBeDefined();
			expect(prop?.required).toBeUndefined();
			expect(prop?.default).toBe('');
			expect(prop?.displayOptions).toEqual({
				show: { operation: ['get_cards'] },
			});
		});
	});

	describe('action parameters visibility', () => {
		test('person_id only shows for action operations', () => {
			const node = new pcoWorkflowActions();
			const prop = node.description.properties.find(
				(p) => p.name === 'person_id',
			);
			expect(prop?.displayOptions).toEqual({
				show: { operation: ['skip_step', 'promote', 'go_back', 'skip_to_step'] },
			});
		});

		test('workflow_card_id only shows for action operations', () => {
			const node = new pcoWorkflowActions();
			const prop = node.description.properties.find(
				(p) => p.name === 'workflow_card_id',
			);
			expect(prop?.displayOptions).toEqual({
				show: { operation: ['skip_step', 'promote', 'go_back', 'skip_to_step'] },
			});
		});
	});

	describe('promote parameters', () => {
		test('promote_until_completed defaults to false and only shows for promote', () => {
			const node = new pcoWorkflowActions();
			const prop = node.description.properties.find(
				(p) => p.name === 'promote_until_completed',
			);
			expect(prop).toBeDefined();
			expect(prop?.default).toBe(false);
			expect(prop?.type).toBe('boolean');
			expect(prop?.displayOptions).toEqual({
				show: { operation: ['promote'] },
			});
		});
	});

	describe('skip_to_step parameters', () => {
		test('target_step_id only shows for skip_to_step', () => {
			const node = new pcoWorkflowActions();
			const targetStep = node.description.properties.find(
				(p) => p.name === 'target_step_id',
			);
			expect(targetStep?.displayOptions).toEqual({
				show: { operation: ['skip_to_step'] },
			});
		});

		test('max_skips defaults to 10', () => {
			const node = new pcoWorkflowActions();
			const maxSkips = node.description.properties.find(
				(p) => p.name === 'max_skips',
			);
			expect(maxSkips?.default).toBe(10);
		});
	});

	describe('execute: get_cards', () => {
		test('returns empty array when no cards match (no sentinel item)', async () => {
			const node = new pcoWorkflowActions();
			const context = createMockExecuteFunctions({
				params: {
					operation: 'get_cards',
					workflow_ids: '689436',
					step_ids: '9999999',
				},
				httpResponse: {
					data: [
						{
							id: '123',
							attributes: { completed_at: null, removed_at: null, moved_to_step_at: '2026-01-01' },
							relationships: {
								current_step: { data: { id: '1111111' } },
								person: { data: { id: '456' } },
							},
						},
					],
					included: [],
					links: {},
				},
			});

			const result = await node.execute.call(context);
			expect(result[0]).toEqual([]);
		});

		test('returns matching cards when step_ids filter matches', async () => {
			const node = new pcoWorkflowActions();
			const context = createMockExecuteFunctions({
				params: {
					operation: 'get_cards',
					workflow_ids: '689436',
					step_ids: '1868744',
				},
				httpResponse: {
					data: [
						{
							id: 'card-1',
							attributes: { completed_at: null, removed_at: null, moved_to_step_at: '2026-03-01' },
							relationships: {
								current_step: { data: { id: '1868744' } },
								person: { data: { id: 'person-1' } },
							},
						},
						{
							id: 'card-2',
							attributes: { completed_at: '2026-02-01', removed_at: null, moved_to_step_at: '2026-01-01' },
							relationships: {
								current_step: { data: { id: '1868744' } },
								person: { data: { id: 'person-2' } },
							},
						},
					],
					included: [
						{ id: '1868744', type: 'WorkflowStep', attributes: { name: 'Connection Made!' } },
					],
					links: {},
				},
			});

			const result = await node.execute.call(context);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual({
				card_id: 'card-1',
				person_id: 'person-1',
				workflow_id: '689436',
				step_id: '1868744',
				step_name: 'Connection Made!',
				moved_to_step_at: '2026-03-01',
			});
		});

		test('skips completed and removed cards', async () => {
			const node = new pcoWorkflowActions();
			const context = createMockExecuteFunctions({
				params: {
					operation: 'get_cards',
					workflow_ids: '689436',
					step_ids: '',
				},
				httpResponse: {
					data: [
						{
							id: 'active',
							attributes: { completed_at: null, removed_at: null, moved_to_step_at: '2026-03-01' },
							relationships: {
								current_step: { data: { id: '100' } },
								person: { data: { id: 'p1' } },
							},
						},
						{
							id: 'completed',
							attributes: { completed_at: '2026-02-01', removed_at: null, moved_to_step_at: '2026-01-01' },
							relationships: {
								current_step: { data: { id: '100' } },
								person: { data: { id: 'p2' } },
							},
						},
						{
							id: 'removed',
							attributes: { completed_at: null, removed_at: '2026-02-15', moved_to_step_at: '2026-01-01' },
							relationships: {
								current_step: { data: { id: '100' } },
								person: { data: { id: 'p3' } },
							},
						},
					],
					included: [],
					links: {},
				},
			});

			const result = await node.execute.call(context);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json.card_id).toBe('active');
		});
	});
});
