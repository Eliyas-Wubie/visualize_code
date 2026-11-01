const { readdirSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');

function checkDirectory(directory) {
  for (const file of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, file.name);
    if (file.isDirectory()) {
      checkDirectory(path);
      continue;
    }
    if (!['.js', '.cjs', '.mjs'].some((extension) => file.name.endsWith(extension))) continue;
    const result = spawnSync(process.execPath, ['--check', path], { stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status || 1);
  }
}

for (const directory of ['src', 'runtime', 'webview', 'scripts', 'test', 'test-support', 'sample'])
  checkDirectory(directory);
