const { readFileSync } = require('node:fs');
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
      require: (name) =>
        name.startsWith('.') ? loadJsx(resolve(dirname(filename), `${name}.jsx`)) : require(name),
    },
    { filename },
  );
  return module.exports;
}

module.exports = { loadJsx };
