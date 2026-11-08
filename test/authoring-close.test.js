const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { transformSync } = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { loadJsx } = require('../test-support/load-jsx');

/** Exercise authoring hook state with deterministic hooks and deferred host responses; DOM rendering is verified separately. */
function authoringHarness() {
  const slots = [];
  const effects = [];
  const requests = [];
  let cursor = 0;
  const same = (a, b) => a && a.length === b.length && a.every((item, i) => Object.is(item, b[i]));
  const hooks = {
    useState(initial) {
      const id = cursor++;
      if (!(id in slots)) slots[id] = initial;
      return [
        slots[id],
        (value) => {
          slots[id] = typeof value === 'function' ? value(slots[id]) : value;
        },
      ];
    },
    useRef(initial) {
      const id = cursor++;
      return (slots[id] ||= { current: initial });
    },
    useCallback(fn, deps) {
      const id = cursor++;
      if (!same(slots[id]?.deps, deps)) slots[id] = { fn, deps };
      return slots[id].fn;
    },
    useEffect(fn, deps) {
      const id = cursor++;
      if (!same(slots[id], deps)) {
        slots[id] = deps;
        effects.push(fn);
      }
    },
  };
  const request = (action) =>
    new Promise((resolve, reject) => requests.push({ action, resolve, reject }));
  const module = { exports: {} };
  runInNewContext(
    transformSync(readFileSync('webview/useAuthoring.jsx', 'utf8'), {
      loader: 'jsx',
      format: 'cjs',
    }).code,
    {
      module,
      exports: module.exports,
      require(name) {
        if (name === 'react') return hooks;
        if (name === './useAuthoringRequests') return { useAuthoringRequests: () => request };
        throw new Error(`Unexpected module: ${name}`);
      },
    },
  );
  const stop = () => {};
  return {
    requests,
    render() {
      cursor = 0;
      const result = module.exports.useAuthoring('functions', stop);
      effects.splice(0).forEach((effect) => effect());
      return result;
    },
  };
}

test('Close dismisses during loading and a late source response cannot reopen the dialog', async () => {
  const host = authoringHarness();
  let editor = host.render();
  const opening = editor.create();
  host.requests[0].resolve({ entries: [] });
  await opening;
  editor = host.render();
  assert.equal(editor.dialog.type, 'create');
  const reload = editor.edit('function-id');
  editor = host.render();
  assert.equal(editor.working, true);
  editor.close();
  editor = host.render();
  assert.equal(editor.dialog, undefined);
  host.requests[1].resolve({ name: 'run', source: 'function run() {}', token: 'late' });
  await reload;
  editor = host.render();
  assert.equal(editor.dialog, undefined);
  assert.equal(editor.working, false);
});

test('Close remains available during mutation and reports completion without reopening', async () => {
  const host = authoringHarness();
  let editor = host.render();
  const opening = editor.edit('id');
  host.requests[0].resolve({ name: 'run', source: 'function run() {}', token: 'original' });
  await opening;
  editor = host.render();
  const saving = editor.apply('save', {
    token: 'original',
    source: 'function run() { return 1; }',
  });
  editor = host.render();
  editor.close();
  assert.equal(host.render().dialog, undefined);
  host.requests[1].resolve({ applied: true });
  await saving;
  editor = host.render();
  assert.equal(editor.dialog, undefined);
  assert(editor.status.includes('Submitted change applied'));
});

test('rendered modal Close button is enabled while a request is pending', () => {
  const { AuthoringDialog } = loadJsx('webview/AuthoringDialog.jsx');
  const html = renderToStaticMarkup(
    React.createElement(AuthoringDialog, {
      mode: 'functions',
      authoring: {
        working: true,
        status: '',
        close() {},
        edit() {},
        apply() {},
        dialog: { type: 'edit', token: 't', name: 'run', source: 'function run() {}' },
      },
    }),
  );
  assert(html.includes('<button type="button" aria-label="Close source editor">Close</button>'));
});
