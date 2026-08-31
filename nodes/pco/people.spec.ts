import {people} from "./people.node";

const collections = () =>
  new people().description.properties.filter(
    (p: any) => p.type === 'collection' && Array.isArray(p.options),
  ) as any[];

test("smoke", () => {
    const node = new people()
    expect(node.description.properties).toBeDefined()
})

describe("query parameter names are path-safe", () => {
  // n8n resolves parameter paths with lodash-style get(). A property named
  // "where[step_id]" is parsed as the path where.step_id, is never found, and the
  // node fails at runtime with "Could not get parameter". Names must therefore
  // contain no square brackets, while the real query-string name is preserved in
  // routing.send.property.

  it("emits no property name containing square brackets", () => {
    const offenders: string[] = [];
    for (const collection of collections()) {
      for (const option of collection.options) {
        if (/[[\]]/.test(option.name)) offenders.push(option.name);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("still sends bracketed filters under their real API name", () => {
    const cards = collections().find((c: any) =>
      JSON.stringify(c.displayOptions).includes('workflow-id--cards'),
    );
    expect(cards).toBeDefined();

    const stepId = cards.options.find((o: any) => o.routing?.send?.property === 'where[step_id]');
    expect(stepId).toBeDefined();
    expect(stepId.name).toBe('where_step_id');
    expect(stepId.displayName).toBe('Where Step Id');
    expect(stepId.routing.send.type).toBe('query');
    expect(stepId.routing.send.propertyInDotNotation).toBe(false);
  });

  it("leaves names without brackets untouched", () => {
    const cards = collections().find((c: any) =>
      JSON.stringify(c.displayOptions).includes('workflow-id--cards'),
    );
    const perPage = cards.options.find((o: any) => o.name === 'per_page');
    expect(perPage).toBeDefined();
    expect(perPage.routing.send.property).toBe('per_page');
  });

  it("resolves every field through the same lookup n8n uses", () => {
    // This is the actual failure mode: lodash get() on the collection path.
    const get = require("lodash/get");
    const unresolvable: string[] = [];
    for (const collection of collections()) {
      for (const option of collection.options) {
        const params = { additionalFields: { [option.name]: 'x' } };
        if (get(params, `additionalFields.${option.name}`) === undefined) {
          unresolvable.push(option.name);
        }
      }
    }
    expect(unresolvable).toEqual([]);
  });
});
