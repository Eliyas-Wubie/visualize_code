const { test } = require('node:test');
const assert = require('node:assert/strict');
const { filterHierarchy, hierarchyModel } = require('../webview/hierarchy-model');

const entries = [
  { id: 'root', path: '', kind: 'folder' },
  { id: 'src', path: 'src', kind: 'folder' },
  { id: 'jobs', path: 'src/jobs', kind: 'folder' },
  { id: 'worker', path: 'src/jobs/worker.py', kind: 'file' },
  { id: 'config', path: 'src/jobs/config.json', kind: 'file' },
  { id: 'other', path: 'other.js', kind: 'file' },
];

test('hierarchy search retains real ancestors and IDs without altering the full creation catalog', () => {
  const result = filterHierarchy(entries, ' WORKER.PY ');
  assert.deepEqual(
    result.map((entry) => entry.id),
    ['root', 'src', 'jobs', 'worker'],
  );
  assert.equal(hierarchyModel(result).children.get('src').children.get('jobs').id, 'jobs');
  assert.equal(entries.length, 6);
  assert.equal(filterHierarchy(entries, ''), entries);
});

test('matching a folder retains its descendants while an empty result retains only the real root', () => {
  assert.deepEqual(
    filterHierarchy(entries, 'src/jobs').map((entry) => entry.id),
    ['root', 'src', 'jobs', 'worker', 'config'],
  );
  assert.deepEqual(
    filterHierarchy(entries, 'missing').map((entry) => entry.id),
    ['root'],
  );
});
