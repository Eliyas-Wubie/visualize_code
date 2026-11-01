const { test } = require('node:test');
const assert = require('node:assert/strict');
const { detectApps } = require('../src/app-detection');

test('monorepo apps are separated by their nearest manifests and framework dependencies', () => {
  const markers = [
    { path: 'package.json', text: '{"name":"workspace","workspaces":["apps/*"]}' },
    {
      path: 'apps/web/package.json',
      text: '{"name":"web","dependencies":{"next":"1","react":"1"}}',
    },
    { path: 'apps/ui/package.json', text: '{"name":"ui","dependencies":{"react":"1"}}' },
    { path: 'apps/api/pyproject.toml', text: '[project]\ndependencies = ["fastapi"]' },
    { path: 'apps/api/main.py', text: 'def main(): pass' },
  ];
  const files = [
    'apps/web/src/app/page.tsx',
    'apps/web/src/app/api/route.ts',
    'apps/ui/src/App.jsx',
    'apps/api/main.py',
  ];
  const { apps } = detectApps(markers, files, 'repo');
  assert.equal(apps.length, 4);
  assert.equal(apps.find((app) => app.name === 'web').framework, 'Next.js');
  assert.equal(apps.find((app) => app.name === 'ui').framework, 'React');
  assert.equal(apps.find((app) => app.root === 'apps/api').framework, 'FastAPI / Python');
  assert.equal(apps.find((app) => app.root === '.').files.length, 0);
  assert.equal(apps.find((app) => app.name === 'web').entries.length, 2);
});

test('invalid markers are reported, standalone Python apps and markerless sources are supported', () => {
  const result = detectApps(
    [
      { path: 'bad/package.json', text: '{oops' },
      { path: 'service/main.py', text: 'def main(): pass' },
    ],
    ['service/main.py'],
    'repo',
  );
  assert.equal(result.issues.length, 1);
  assert.equal(result.apps[0].framework, 'Python');
  assert.equal(detectApps([], ['src/work.py'], 'repo').apps[0].name, 'repo');
});

test('config detection preserves app names and unnamed packages receive safe fallbacks', () => {
  const { apps } = detectApps(
    [
      { path: 'web/package.json', text: '{"name":"my-web","main":42}' },
      { path: 'web/next.config.js', text: 'export default {}' },
      { path: 'ui/package.json', text: '{"dependencies":{"react":"1"}}' },
    ],
    ['web/app/page.tsx', 'ui/src/App.jsx', 'tools/helper.py'],
    'repo',
  );
  assert.equal(apps.find((app) => app.root === 'web').name, 'my-web');
  assert.equal(apps.find((app) => app.root === 'ui').name, 'ui');
  assert.equal(apps.find((app) => app.root === '.').files[0], 'tools/helper.py');
});
