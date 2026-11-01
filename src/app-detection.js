const path = require('node:path').posix;
const { classify } = require('./app-markers');
const { isEntry } = require('./app-entries');

/** Group manifests by directory and assign each source file to its nearest app root. */
function detectApps(markers, sources, workspaceName) {
  const groups = new Map();
  const issues = [];
  const priority = (marker) =>
    ['main.py', '__main__.py'].includes(path.basename(marker.path))
      ? 2
      : marker.path.endsWith('package.json')
        ? 0
        : 1;
  for (const marker of [...markers].sort((a, b) => priority(a) - priority(b))) {
    const root = path.dirname(marker.path);
    if (
      priority(marker) === 2 &&
      [...groups.values()].some(
        (app) =>
          app.language === 'py' &&
          (app.root === '.' || root === app.root || root.startsWith(`${app.root}/`)),
      )
    )
      continue;
    try {
      const info = classify(path.basename(marker.path), marker.text);
      const prior = groups.get(root);
      if (!prior || prior.framework === 'Python' || info.framework === 'Next.js') {
        groups.set(root, {
          ...prior,
          ...info,
          root,
          name: info.name || prior?.name || (root === '.' ? workspaceName : path.basename(root)),
          files: [],
        });
      }
    } catch {
      issues.push(`Could not read app marker: ${marker.path}`);
    }
  }
  if (!groups.size && sources.length)
    groups.set('.', { root: '.', name: workspaceName, framework: 'Source workspace', files: [] });
  for (const file of sources) {
    const owners = [...groups.values()].filter(
      (app) => app.root === '.' || file.startsWith(`${app.root}/`),
    );
    const owner = owners.sort((a, b) => b.root.length - a.root.length)[0];
    if (owner) owner.files.push(file);
    else {
      if (!groups.has('.'))
        groups.set('.', {
          root: '.',
          name: workspaceName,
          framework: 'Source workspace',
          files: [],
        });
      groups.get('.').files.push(file);
    }
  }
  return {
    apps: [...groups.values()].map((app) => ({
      ...app,
      entries: app.files.filter((file) => isEntry(file, app)),
    })),
    issues,
  };
}

module.exports = { classify, detectApps, isEntry };
