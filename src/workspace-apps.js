const { detectApps } = require('./app-detection');

const EXCLUDE =
  '**/{node_modules,.git,.next,.venv,venv,env,__pycache__,dist,build,coverage,.tox,.mypy_cache,site-packages}/**';
const MARKERS =
  '**/{package.json,pyproject.toml,requirements*.txt,setup.py,setup.cfg,manage.py,main.py,__main__.py,next.config.*,vite.config.*}';
const SOURCES = '**/*.{js,jsx,ts,tsx,mjs,cjs,py}';

/** Discover apps across all workspace folders using bounded, read-only filesystem queries. */
async function discoverWorkspace(vscode) {
  const apps = [];
  const issues = [];
  for (const folder of vscode.workspace.workspaceFolders || []) {
    const [markerFiles, sourceFiles] = await Promise.all([
      vscode.workspace.findFiles(new vscode.RelativePattern(folder, MARKERS), EXCLUDE, 501),
      vscode.workspace.findFiles(new vscode.RelativePattern(folder, SOURCES), EXCLUDE, 4001),
    ]);
    if (markerFiles.length > 500 || sourceFiles.length > 4000)
      issues.push(`${folder.name}: discovery limit reached; some apps or files are omitted.`);
    const relative = (uri) => uri.path.slice(folder.uri.path.length + 1);
    const markers = [];
    for (const uri of markerFiles.slice(0, 500)) {
      try {
        const stat = await vscode.workspace.fs.stat(uri);
        if (stat.size > 1024 * 1024) {
          issues.push(`App marker too large: ${relative(uri)}`);
          continue;
        }
        markers.push({
          path: relative(uri),
          text: Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8'),
        });
      } catch {
        issues.push(`Cannot read ${relative(uri)}`);
      }
    }
    const result = detectApps(
      markers,
      sourceFiles.slice(0, 4000).map(relative).sort(),
      folder.name,
    );
    issues.push(...result.issues);
    apps.push(
      ...result.apps.map((app) => ({ ...app, folder, id: `${folder.uri.toString()}/${app.root}` })),
    );
  }
  return { apps, issues };
}

module.exports = { discoverWorkspace, EXCLUDE, MARKERS };
