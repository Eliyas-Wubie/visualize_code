const { existsSync, readFileSync, writeFileSync } = require('node:fs');
const { dirname, join, resolve, parse } = require('node:path');

/** Preserve license text for packages actually included in an esbuild bundle; missing licenses fail the build. */
function writeThirdPartyNotices(inputs, output) {
  const packages = new Map();
  for (const input of Object.keys(inputs)) {
    if (!input.split('/').includes('node_modules')) continue;
    let directory = dirname(resolve(input));
    while (directory !== parse(directory).root && !existsSync(join(directory, 'package.json')))
      directory = dirname(directory);
    const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
    const id = `${manifest.name}@${manifest.version}`;
    if (packages.has(id)) continue;
    const license = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'license.md', 'license.txt']
      .map((name) => join(directory, name))
      .find(existsSync);
    if (!license) throw new Error(`Bundled dependency ${id} has no packaged license text.`);
    packages.set(id, readFileSync(license, 'utf8').trim());
  }
  const entries = [...packages]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, license]) => `${name}\n${'='.repeat(name.length)}\n${license}`);
  writeFileSync(
    output,
    `Third-party licenses for the bundled webview\n\n${entries.join('\n\n')}\n`,
  );
}

module.exports = { writeThirdPartyNotices };
