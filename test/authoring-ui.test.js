const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { loadJsx } = require('../test-support/load-jsx');

test('creation offers hierarchy locations and entity types, while architecture exposes no authoring dialog', () => {
  const { AuthoringDialog } = loadJsx('webview/AuthoringDialog.jsx');
  const authoring = {
    working: false,
    status: '',
    close() {},
    request() {},
    apply() {},
    dialog: {
      type: 'create',
      entries: [
        { id: 'root', path: '', kind: 'folder' },
        { id: 'nested', path: 'src/features', kind: 'folder' },
      ],
    },
  };
  const html = renderToStaticMarkup(
    React.createElement(AuthoringDialog, { authoring, mode: 'files' }),
  );
  assert(html.includes('Source authoring'));
  assert(html.includes('Project hierarchy'));
  assert(html.includes('Select folder src/features'));
  assert(html.includes('File contents'));
  assert(html.includes('creation-properties'));
  for (const type of ['file', 'folder', 'function', 'class'])
    assert(html.includes(`>${type}</option>`));
  assert.equal(
    renderToStaticMarkup(React.createElement(AuthoringDialog, { authoring, mode: 'architecture' })),
    '',
  );
});

test('source editor separates semantic rename from source apply and escapes source text', () => {
  const { SourceEditForm } = loadJsx('webview/SourceEditForm.jsx');
  const html = renderToStaticMarkup(
    React.createElement(SourceEditForm, {
      authoring: {
        dialog: {
          name: 'run',
          source: 'function run() { return "</textarea><script>bad</script>"; }',
          token: 'test',
        },
        working: false,
        apply() {},
      },
    }),
  );
  assert(html.includes('Rename references'));
  assert(html.includes('class="dialog-save"'));
  assert(html.includes('>Save</button>'));
  assert(html.includes('do not rewrite arguments'));
  assert(html.includes('&lt;/textarea&gt;&lt;script&gt;bad&lt;/script&gt;'));
  assert(!html.includes('<script>'));
});
