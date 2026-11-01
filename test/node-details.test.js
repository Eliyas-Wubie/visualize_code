const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { loadJsx } = require('../test-support/load-jsx');

test('node details render documentation and errors as escaped text with accessible dialog controls', () => {
  const { NodeDetails } = loadJsx('webview/NodeDetails.jsx');
  const data = {
    hostId: 'run',
    name: 'run',
    file: 'sample.js',
    line: 2,
    parameters: '(input)',
    documentation: '<script>untrusted()</script>',
    diagnostics: [],
    logs: [
      { level: 'error', text: '<img src=x onerror=alert(1)>', time: 0, position: { line: 3 } },
    ],
    open() {},
  };
  const html = renderToStaticMarkup(
    React.createElement(NodeDetails, { data, live: {}, close() {} }),
  );
  assert.ok(html.includes('role="dialog"'));
  assert.ok(html.includes('aria-label="Close node details"'));
  assert.ok(html.includes('Documentation'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('&lt;img'));
  assert.equal(html.includes('<script>'), false);
});
