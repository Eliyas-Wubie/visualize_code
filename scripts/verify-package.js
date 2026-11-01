const { readdirSync, mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');

/** Validate a package preview against runtime requirements and forbidden development/private paths; throw on leaks or omissions. */
function validatePackageFiles(files, required) {
  const paths = new Set(files.map((file) => file.path));
  const excluded = [
    'dev_docs',
    'test',
    'test-support',
    'reports',
    'scripts',
    'webview',
    'node_modules',
    '.git',
    '.github',
    '.vscode',
  ];
  for (const path of paths) {
    if (excluded.some((directory) => path === directory || path.startsWith(`${directory}/`)))
      throw new Error(`Unexpected package content: ${path}`);
  }
  for (const path of required)
    if (!paths.has(path)) throw new Error(`Missing package content: ${path}`);
}

/** List host/runtime source requirements while excluding caches and non-source files. */
function runtimeFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? runtimeFiles(path)
      : ['.js', '.cjs', '.mjs', '.py'].some((extension) => entry.name.endsWith(extension))
        ? [path.split('\\').join('/')]
        : [];
  });
}

/** Run npm's offline package preview and save its reviewed file list without producing or publishing an archive. */
function main() {
  if (!process.env.npm_execpath) throw new Error('Run this check with npm run check:package.');
  const result = spawnSync(
    process.execPath,
    [
      process.env.npm_execpath,
      'pack',
      '--dry-run',
      '--json',
      '--ignore-scripts',
      '--cache',
      'reports/npm-cache',
    ],
    { encoding: 'utf8' },
  );
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      'npm package preview failed. Check npm cache permissions and the package manifest.',
    );
  const [preview] = JSON.parse(result.stdout);
  const required = [
    'package.json',
    'LICENSE',
    'README.md',
    'CHANGELOG.md',
    'media/bundle.js',
    'media/bundle.css',
    'media/activity.svg',
    'media/icon.png',
    'media/THIRD_PARTY_NOTICES.txt',
    ...runtimeFiles('src'),
    ...runtimeFiles('runtime'),
  ];
  validatePackageFiles(preview.files, required);
  mkdirSync('reports', { recursive: true });
  writeFileSync('reports/package-files.json', JSON.stringify(preview.files, null, 2) + '\n');
  console.log(
    `Package preview verified: ${preview.files.length} runtime/distribution files; development and local-only paths excluded.`,
  );
}

if (require.main === module) main();
module.exports = { validatePackageFiles };
