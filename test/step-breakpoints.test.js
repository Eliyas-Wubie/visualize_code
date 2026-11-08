const { test } = require('node:test');
const assert = require('node:assert/strict');
const { functionEntry } = require('../src/function-entry');
const { installStepBreakpoints } = require('../src/step-breakpoints');
const { keepStepFocus } = require('../src/step-focus');
const { entryDocument } = require('../test-support/entry-document');
const { stepSourceItem } = require('../src/step-source-items');
const { StepSetupError } = require('../src/step-error');
const { liveSnapshot } = require('../src/live-match');
const { createStepRun } = require('../src/step-run');

test('breakpoints resolve inside JavaScript bodies and Python bodies after multiline signatures/docstrings', () => {
  for (const [text, name, language, expected] of [
    [
      'function run(value = {x: "}"}) { /* ignored { */ return value; }',
      'run',
      'javascript',
      'return',
    ],
    ['const run = (x) => x * 2;', 'run', 'javascript', 'x *'],
    ['const run = x => { return x; };', 'run', 'javascript', 'return'],
    ['async run(x) {\n return x;\n}', 'run', 'javascript', 'return'],
    [
      'def run(\n value={"a": 1},\n) -> dict[str, int]:\n """Ignore : and\n multiline docs."""\n # comment\n return value',
      'run',
      'python',
      'return',
    ],
    ['def run(x): return x', 'run', 'python', 'return'],
    [
      'function run(x: number): { value: number } { return { value: x }; }',
      'run',
      'typescript',
      'return',
    ],
  ]) {
    const { document, item } = entryDocument(text, name, language);
    const position = functionEntry(document, item);
    assert.equal(document.offsetAt(position), text.indexOf(expected));
  }
});

test('provider selections spanning signatures or entire bodies still resolve the actual function entry', () => {
  for (const [text, language] of [
    [
      '@decorator("def run(): fake")\ndef run(value):\n    """docs"""\n    return value\n',
      'python',
    ],
    ['function run(value) { return value; }', 'javascript'],
  ]) {
    const { document, item } = entryDocument(text, 'run', language);
    item.range.start = document.positionAt(0);
    item.selectionRange = item.range;
    assert.equal(document.offsetAt(functionEntry(document, item)), text.indexOf('return'));
    const signatureEnd = text.indexOf(language === 'python' ? ':\n' : '{') + 1;
    item.selectionRange = { start: document.positionAt(0), end: document.positionAt(signatureEnd) };
    assert.equal(document.offsetAt(functionEntry(document, item)), text.indexOf('return'));
  }
});

test('Pylance identifier-only ranges recover full bodies without changing provider items; paused body lines highlight correctly', async () => {
  const text = 'def run(value):\n    return value\n';
  const { document, item } = entryDocument(text, 'run', 'python');
  const nameRange = { start: document.positionAt(4), end: document.positionAt(7) };
  item.uri = { toString: () => 'file:///main.py' };
  item.range = nameRange;
  item.selectionRange = nameRange;
  const fullRange = { start: document.positionAt(0), end: document.positionAt(text.length) };
  let requests = 0;
  const vscode = {
    commands: {
      executeCommand: async () => {
        requests++;
        return [{ name: 'Outer', range: fullRange, children: [{ name: 'run', range: fullRange }] }];
      },
    },
  };
  const cache = new Map();
  const resolved = await stepSourceItem(vscode, item, cache);
  await stepSourceItem(vscode, item, cache);
  assert.equal(requests, 1);
  assert.equal(item.range, nameRange);
  assert.equal(resolved.range, fullRange);
  const position = functionEntry(document, resolved);
  assert.equal(document.offsetAt(position), text.indexOf('return'));
  const graph = { items: new Map([['run', item]]), nodes: new Map([['run', { name: 'run' }]]) };
  const state = { frames: [{ uri: item.uri.toString(), position }], records: new Map() };
  const control = createStepRun(state, () => {});
  control.prepare(graph, new Map([['run', resolved]]));
  await control.stopped({}, state.frames, { threadId: 1, reason: 'breakpoint' });
  assert.equal(liveSnapshot(graph, state).current, 'run');
  assert.deepEqual(state.step.visited, ['run']);
});

test('unresolved source names produce actionable breakpoint errors rather than interpreter advice', async () => {
  await assert.rejects(
    installStepBreakpoints(
      {
        workspace: {
          openTextDocument: async () => {
            throw new Error('private provider error');
          },
        },
      },
      { items: new Map([['run', { name: 'run' }]]) },
    ),
    (error) => {
      assert(error instanceof StepSetupError);
      assert(error.message.includes('run (source document unavailable)'));
      assert(!error.message.includes('private provider error'));
      return true;
    },
  );
});

test('automatic breakpoints precede launch, reuse unconditional user breakpoints and remove only owned entries', async () => {
  const { document, item } = entryDocument('function run() { return 1; }', 'run');
  item.uri = { toString: () => 'file:///run.js' };
  const existing = {
    enabled: true,
    condition: 'x > 0',
    location: { uri: item.uri, range: { start: functionEntry(document, item) } },
  };
  const entries = [existing];
  const vscode = {
    workspace: { openTextDocument: async () => document },
    Location: class {
      constructor(uri, position) {
        this.uri = uri;
        this.range = { start: position };
      }
    },
    SourceBreakpoint: class {
      constructor(location) {
        this.location = location;
        this.enabled = true;
      }
    },
    debug: {
      breakpoints: entries,
      addBreakpoints: (owned) => entries.push(...owned),
      removeBreakpoints: (owned) =>
        owned.forEach((entry) => entries.splice(entries.indexOf(entry), 1)),
    },
  };
  const graph = { items: new Map([['run', item]]) };
  const first = await installStepBreakpoints(vscode, graph);
  assert.equal(first.count, 1);
  assert.equal(entries.length, 2);
  const second = await installStepBreakpoints(vscode, graph);
  assert.equal(entries.length, 2);
  second.dispose();
  assert.equal(entries.length, 2);
  first.dispose();
  assert.deepEqual(entries, [existing]);
});

test('focus suppression restores the prior override and preserves user changes made during a run', async () => {
  let value;
  const changes = [];
  const configuration = {
    inspect: () => ({ workspaceValue: value }),
    get: () => value ?? true,
    update: async (_, next) => {
      value = next;
      changes.push(next);
    },
  };
  const vscode = {
    workspace: { getConfiguration: () => configuration },
    ConfigurationTarget: { Workspace: 2 },
  };
  const first = await keepStepFocus(vscode);
  assert.equal(value, false);
  await first.dispose();
  assert.equal(value, undefined);
  const second = await keepStepFocus(vscode);
  value = true;
  await second.dispose();
  assert.equal(value, true);
  assert.deepEqual(changes, [false, undefined, false]);
});
