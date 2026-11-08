const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { ReactFlowProvider } = require('@xyflow/react');
const { loadJsx } = require('../test-support/load-jsx');

test('function, class and file cards expose direct source-edit buttons', () => {
  for (const [file, component] of [
    ['FunctionNode', 'FunctionNode'],
    ['ClassNode', 'ClassNode'],
    ['FileNode', 'FileNode'],
  ]) {
    const Node = loadJsx(`webview/${file}.jsx`)[component];
    const data = {
      name: 'Worker',
      displayName: 'Worker',
      file: 'worker.js',
      line: 1,
      methods: [],
      loaded: true,
      edit() {},
      inspect() {},
    };
    const html = renderToStaticMarkup(
      React.createElement(ReactFlowProvider, null, React.createElement(Node, { data })),
    );
    assert(html.includes('aria-label="Edit Worker code"'));
    assert(html.includes('node-edit nodrag'));
    assert(html.includes('<svg'));
    assert(!html.includes('>Edit</button>'));
  }
});

test('edit click opens the authoritative source without triggering card selection; read-only nodes have no button', () => {
  const { NodeEditButton } = loadJsx('webview/NodeEditButton.jsx');
  let selected;
  let stopped = false;
  const button = NodeEditButton({
    data: {
      name: 'file.js',
      hostId: 'file-node',
      editId: 'resource-id',
      edit(id) {
        selected = id;
      },
    },
  });
  button.props.onClick({
    stopPropagation() {
      stopped = true;
    },
  });
  assert.equal(selected, 'resource-id');
  assert.equal(stopped, true);
  assert.equal(NodeEditButton({ data: { name: 'readonly' } }), null);
});
