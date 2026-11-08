const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { loadJsx } = require('../test-support/load-jsx');

test('architecture summary and details explain uncertainty and safely display source evidence', () => {
  const { ArchitectureSummary } = loadJsx('webview/ArchitectureNode.jsx');
  const summary = renderToStaticMarkup(
    React.createElement(ArchitectureSummary, {
      architecture: { pattern: 'Architecture undetermined', evidence: '<script>unknown</script>' },
    }),
  );
  assert(summary.includes('Architecture undetermined'));
  assert(summary.includes('not certify'));
  assert(summary.includes('&lt;script&gt;unknown&lt;/script&gt;'));
  const { NodeDetails } = loadJsx('webview/NodeDetails.jsx');
  const html = renderToStaticMarkup(
    React.createElement(NodeDetails, {
      data: {
        kind: 'architecture',
        hostId: 'area:service',
        sourceId: 'fn',
        name: 'Services',
        file: 'services/main.ts',
        line: 1,
        files: ['services/main.ts'],
        methods: [],
        evidence: ['<script>Path convention: services</script>'],
        logs: [],
        diagnostics: [],
      },
      live: {},
      close() {},
    }),
  );
  assert(html.includes('Estimated architecture area'));
  assert(html.includes('Classification evidence (1 files)'));
  assert(html.includes('Discovered functions'));
  assert(!html.includes('<script>'));
});
