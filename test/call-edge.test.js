const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { ReactFlowProvider, Position } = require('@xyflow/react');
const { loadJsx } = require('../test-support/load-jsx');

test('hover edge labels render escaped endpoint names with a wide pointer target, including loops', () => {
  const { CallEdge } = loadJsx('webview/CallEdge.jsx');
  for (const target of ['b', 'a']) {
    const html = renderToStaticMarkup(
      React.createElement(
        ReactFlowProvider,
        null,
        React.createElement(
          'svg',
          null,
          React.createElement(CallEdge, {
            id: 'ab',
            source: 'a',
            target,
            sourceX: 0,
            sourceY: 100,
            targetX: 0,
            targetY: 0,
            sourcePosition: Position.Bottom,
            targetPosition: Position.Top,
            data: { lines: [5] },
            label: '<script>caller</script> → Worker.run',
          }),
        ),
      ),
    );
    assert(html.includes('&lt;script&gt;caller&lt;/script&gt;'));
    assert(!html.includes('<script>'));
    assert(html.includes('stroke-width="24"'));
    assert(html.includes('react-flow__edge-text'));
    if (target === 'a') assert(html.includes('translate(195 50)'));
  }
});
