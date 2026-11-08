const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { loadJsx } = require('../test-support/load-jsx');

test('empty scoped maps offer a named refresh action without obscuring loading or error states', () => {
  const { MapNotices } = loadJsx('webview/MapNotices.jsx');
  const render = (graph, count = 0) =>
    renderToStaticMarkup(
      React.createElement(MapNotices, { graph, count, mode: 'functions', refresh() {} }),
    );
  const empty = render({ limit: 300 });
  assert(empty.includes('aria-label="Empty map"'));
  assert(empty.includes('No mapped code in this scope'));
  assert(empty.includes('Refresh map</button>'));
  assert(!render({}).includes('Empty map'));
  assert(!render({ limit: 300, error: 'Provider unavailable' }).includes('Empty map'));
  assert(!render({ limit: 300 }, 3).includes('Empty map'));
});
