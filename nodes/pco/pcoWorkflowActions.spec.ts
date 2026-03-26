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

	test('has all four operations', () => {
		const node = new pcoWorkflowActions();
		const operationProp = node.description.properties.find(
			(p) => p.name === 'operation',
		);
		expect(operationProp).toBeDefined();
		const values = (operationProp as any).options.map(
			(o: any) => o.value,
		);
		expect(values).toEqual([
			'skip_step',
			'promote',
			'go_back',
			'skip_to_step',
		]);
	});

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
