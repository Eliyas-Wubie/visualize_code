const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { loadJsx } = require('../test-support/load-jsx');

test('file details show aggregated functions and health with file-specific labels', () => {
  const { NodeDetails } = loadJsx('webview/NodeDetails.jsx');
  const html = renderToStaticMarkup(
    React.createElement(NodeDetails, {
      data: {
        kind: 'file',
        hostId: 'file:src/main.js',
        sourceId: 'main',
        name: 'main.js',
        file: 'src/main.js',
        line: 1,
        methods: [{ id: 'main', name: 'main', documentation: '<script>bad</script>' }],
        diagnostics: [{ level: 'warning', text: 'Synthetic warning' }],
        logs: [],
      },
      live: {},
      close() {},
    }),
  );
  assert(html.includes('Discovered functions'));
  assert(html.includes('<p>File</p>'));
  assert(html.includes('Synthetic warning'));
  assert(html.includes('&lt;script&gt;bad&lt;/script&gt;'));
  assert(!html.includes('Estimated local complexity'));
});
