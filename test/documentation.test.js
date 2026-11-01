const { test } = require('node:test');
const assert = require('node:assert/strict');
const { hoverDocumentation, enrichDocumentation } = require('../src/documentation');

test('hover documentation omits the signature but retains description, tags, and examples', () => {
  assert.equal(
    hoverDocumentation([
      {
        contents: [
          { value: '```typescript\nfunction run(input: string): void\n```' },
          { value: 'Run the task.\n@param input Task input.\n```js\nrun("sample")\n```' },
        ],
      },
    ]),
    'Run the task.\n@param input Task input.\n```js\nrun("sample")\n```',
  );
  assert.equal(
    hoverDocumentation([{ contents: [{ value: '```js\nrun()\n```\nExisting docs.' }] }]),
    'Existing docs.',
  );
  assert.equal(hoverDocumentation([{ contents: [{ value: '```js\nrun()\n```' }] }]), null);
  assert.equal(hoverDocumentation([]), null);
});

test('documentation is cached and provider failures remain explicit', async () => {
  const node = { id: 'run' };
  const graph = {
    nodes: new Map([['run', node]]),
    items: new Map([['run', { uri: 'file', selectionRange: { start: {} } }]]),
  };
  let calls = 0;
  await enrichDocumentation(graph, async () => {
    calls++;
    return [{ contents: ['Existing documentation'] }];
  });
  await enrichDocumentation(graph, async () => {
    calls++;
  });
  assert.equal(calls, 1);
  assert.equal(node.documentation, 'Existing documentation');
  node.documentation = undefined;
  await enrichDocumentation(graph, async () => {
    throw new Error('provider offline');
  });
  assert.equal(node.documentation, null);
  assert.equal(node.documentationError, 'Documentation unavailable from language extension.');
});
