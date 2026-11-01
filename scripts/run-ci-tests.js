const { mkdirSync } = require('node:fs');
const { spawnSync } = require('node:child_process');

mkdirSync('reports', { recursive: true });
const result = spawnSync(
  process.execPath,
  [
    '--test',
    '--test-reporter=spec',
    '--test-reporter=junit',
    '--test-reporter-destination=stdout',
    '--test-reporter-destination=reports/tests.xml',
  ],
  { stdio: 'inherit' },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
