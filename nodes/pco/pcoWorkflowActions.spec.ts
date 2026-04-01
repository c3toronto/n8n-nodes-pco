import { pcoWorkflowActions } from './pcoWorkflowActions.node';

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
});
