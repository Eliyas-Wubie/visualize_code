const { test } = require('node:test');
const assert = require('node:assert/strict');
const { extractParameters, enrichParameters } = require('../src/parameters');
const { CallGraph } = require('../src/graph');

test('parameters retain defaults, destructuring, types, multiline declarations, and nested callbacks', () => {
  const parameters = '(items, { limit = 10 } = {}, transform = (value) => value, label = ")")';
  assert.equal(extractParameters(`${parameters} { return items; }`), parameters);
  assert.equal(
    extractParameters('(\n input: string,\n count = 2\n): Result {}'),
    '(\n input: string,\n count = 2\n)',
  );
  assert.equal(extractParameters('() {}'), '()');
  assert.equal(extractParameters('(value /* ) */, count = 1) {}'), '(value /* ) */, count = 1)');
});

test('parameters support generic functions and arrow declarations without guessing unsupported syntax', () => {
  assert.equal(extractParameters('<T extends Map<string, number>>(value: T) {}'), '(value: T)');
  assert.equal(extractParameters(' = async (item, index = 0) => item'), '(item, index = 0)');
  assert.equal(extractParameters(' = item => item'), '(item)');
  assert.equal(extractParameters(' { someOtherFunction(wrong); }'), null);
  assert.equal(extractParameters('(unfinished'), null);
});

test('source metadata is attached to graph nodes, with explicit unavailable values on failures', async () => {
  const graph = new CallGraph(
    async () => [],
    () => 'main.js',
  );
  const node = graph.add({
    name: 'main',
    uri: { toString: () => 'file:///main.js' },
    selectionRange: { start: { line: 0, character: 9 }, end: { line: 0, character: 13 } },
  });
  await enrichParameters(graph, async () => ({
    offsetAt: (position) => position.character,
    getText: () => 'function main(order, balance = 0) {}',
  }));
  assert.equal(node.parameters, '(order, balance = 0)');
  node.parameters = undefined;
  await enrichParameters(graph, async () => {
    throw new Error('cannot read source');
  });
  assert.equal(node.parameters, null);
});
