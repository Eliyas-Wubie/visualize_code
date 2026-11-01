const { test } = require('node:test');
const assert = require('node:assert/strict');
const { liveSupportError } = require('../webview/liveSupport');

test('old extension hosts produce actionable restart guidance instead of silently ignoring live runs', () => {
  assert.equal(
    liveSupportError({ nodes: [] }),
    'Restart Extension Development Host: stop its debug session in the original VS Code window, then press F5.',
  );
  assert.equal(liveSupportError({ capabilities: { live: true } }), undefined);
});
