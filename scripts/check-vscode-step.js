const fs = require('node:fs/promises');
const path = require('node:path');
const { tmpdir } = require('node:os');
const { spawn, execFileSync } = require('node:child_process');

/** Launch an isolated VS Code test host with existing Python extensions, synthetic files and no user profile or extension installs. */
async function main() {
  const executable = process.argv[2];
  const extensions = process.argv[3];
  if (!executable || !extensions)
    throw new Error('Supply Code executable and installed extensions directory.');
  const root = path.resolve(__dirname, '..');
  const report = path.join(root, 'reports', `vscode-step-${Date.now()}`);
  const workspace = path.join(report, 'workspace');
  const isolatedExtensions = path.join(report, 'extensions');
  const profile = await fs.mkdtemp(path.join(tmpdir(), 'visualizer-vscode-profile-'));
  await fs.mkdir(path.join(workspace, '.vscode'), { recursive: true });
  await fs.mkdir(isolatedExtensions, { recursive: true });
  await fs.mkdir(path.join(profile, 'User'), { recursive: true });
  const available = new Map();
  for (const entry of await fs.readdir(extensions, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    try {
      const directory = path.join(extensions, entry.name);
      const manifest = JSON.parse(await fs.readFile(path.join(directory, 'package.json'), 'utf8'));
      available.set(`${manifest.publisher}.${manifest.name}`, {
        directory,
        manifest,
        name: entry.name,
      });
    } catch {
      /* Ignore extension cache directories without manifests. */
    }
  }
  const included = new Set();
  const include = async (id) => {
    if (included.has(id)) return;
    const entry = available.get(id);
    if (!entry) throw new Error(`Required existing extension missing: ${id}`);
    included.add(id);
    await fs.symlink(entry.directory, path.join(isolatedExtensions, entry.name), 'junction');
    for (const dependency of entry.manifest.extensionDependencies || []) await include(dependency);
  };
  await include('ms-python.debugpy');
  await include('ms-python.vscode-pylance');
  const python = execFileSync('python', ['-c', 'import sys; print(sys.executable)'], {
    encoding: 'utf8',
    windowsHide: true,
  }).trim();
  await fs.writeFile(
    path.join(workspace, '.vscode', 'settings.json'),
    JSON.stringify({ 'python.defaultInterpreterPath': python }),
  );
  await fs.writeFile(
    path.join(profile, 'User', 'settings.json'),
    JSON.stringify({
      'telemetry.telemetryLevel': 'off',
      'update.mode': 'none',
      'extensions.autoUpdate': false,
      'extensions.autoCheckUpdates': false,
      'workbench.startupEditor': 'none',
    }),
  );
  await fs.writeFile(
    path.join(workspace, 'main.py'),
    'def twice(value):\n    return value * 2\ndef recurse(value):\n    if value > 0: return recurse(value - 1)\n    return 0\ndef main():\n    twice(1); twice(2); recurse(2)\nmain()\n',
  );
  await fs.writeFile(
    path.join(workspace, 'main.cjs'),
    'function twice(value) { return value * 2; }\nfunction recurse(value) { if (value > 0) return recurse(value - 1); return 0; }\nfunction main() { twice(1); twice(2); recurse(2); }\nmain();\n',
  );
  await fs.writeFile(
    path.join(workspace, 'class_main.py'),
    'class Worker:\n    def calculate(self):\n        return 1\n    def tick(self):\n        return self.calculate()\ndef main():\n    worker = Worker()\n    worker.tick()\nmain()\n',
  );
  const environment = { ...process.env };
  delete environment.ELECTRON_RUN_AS_NODE;
  for (const name of Object.keys(environment))
    if (name.startsWith('VSCODE_')) delete environment[name];
  const child = spawn(
    executable,
    [
      '--new-window',
      '--skip-welcome',
      '--skip-release-notes',
      '--disable-workspace-trust',
      `--user-data-dir=${profile}`,
      `--extensions-dir=${isolatedExtensions}`,
      `--extensionDevelopmentPath=${root}`,
      `--extensionTestsPath=${path.join(root, 'test-support', 'vscode-step-suite.js')}`,
      workspace,
    ],
    { windowsHide: true, env: environment, stdio: ['ignore', 'ignore', 'pipe'] },
  );
  let diagnostic = '';
  child.stderr.on('data', (chunk) => {
    diagnostic = (diagnostic + chunk).slice(-4000);
  });
  const timeout = setTimeout(() => child.kill(), 60000);
  try {
    const code = await new Promise((resolve, reject) => {
      child.once('exit', resolve);
      child.once('error', reject);
    });
    const result = await fs.readFile(path.join(workspace, 'results.json'), 'utf8').catch(() => {
      throw new Error(`VS Code exited ${code} before test report: ${diagnostic}`);
    });
    console.log(result);
    console.log(`VS Code test report: ${report}`);
    if (code !== 0 || JSON.parse(result).error) process.exitCode = 1;
  } finally {
    clearTimeout(timeout);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
