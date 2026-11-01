const { test } = require('node:test');
const assert = require('node:assert/strict');
const { zoomAt, panBy } = require('../webview/navigation');

test('zoom sensitivity changes speed without moving the point under the cursor', () => {
  const view = { x: 10, y: 20, zoom: 1 };
  const cursor = { x: 110, y: 220 };
  const slow = zoomAt(view, cursor, -100, 0.2);
  const fast = zoomAt(view, cursor, -100, 2);
  assert.ok(fast.zoom > slow.zoom);
  assert.ok(Math.abs((cursor.x - fast.x) / fast.zoom - 100) < 0.00001);
  assert.ok(Math.abs((cursor.y - fast.y) / fast.zoom - 200) < 0.00001);
  assert.equal(zoomAt(view, cursor, -100000, 3).zoom, 2);
  assert.equal(zoomAt(view, cursor, 100000, 3).zoom, 0.05);
});

test('pan sensitivity scales both axes independently of zoom', () => {
  assert.deepEqual(panBy({ x: 10, y: 20, zoom: 0.5 }, 20, -10, 2), { x: 50, y: 0, zoom: 0.5 });
});
