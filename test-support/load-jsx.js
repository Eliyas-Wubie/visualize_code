const { readFileSync, existsSync } = require('node:fs');
const { resolve, dirname } = require('node:path');
const { runInNewContext } = require('node:vm');
const { transformSync } = require('esbuild');

/** Compile a local JSX component in memory for real React server-rendering tests; no artifacts are written. */
function loadJsx(file) {
  const filename = resolve(file);
  const module = { exports: {} };
  const source = transformSync(readFileSync(filename, 'utf8'), {
    loader: 'jsx',
    format: 'cjs',
  }).code;
  runInNewContext(
    source,
    {
      module,
      exports: module.exports,
      require: (name) => {
        if (!name.startsWith('.')) return require(name);
        const path = resolve(dirname(filename), name);
        return existsSync(`${path}.jsx`) ? loadJsx(`${path}.jsx`) : require(path);
      },
    },
    { filename },
  );
  return module.exports;
}

module.exports = { loadJsx };
