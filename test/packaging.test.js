const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validatePackageFiles } = require('../scripts/verify-package');

test('package validation rejects private/development files and missing runtime adapters', () => {
  assert.doesNotThrow(() =>
    validatePackageFiles([{ path: 'src/extension.js' }], ['src/extension.js']),
  );
  assert.throws(
    () => validatePackageFiles([{ path: 'dev_docs/local_only/questions_and_answers.md' }], []),
    { message: 'Unexpected package content: dev_docs/local_only/questions_and_answers.md' },
  );
  assert.throws(() => validatePackageFiles([], ['runtime/python/run.py']), {
    message: 'Missing package content: runtime/python/run.py',
  });
});
