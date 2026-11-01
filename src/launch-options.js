const { extname } = require('node:path');

/** Determine whether a launch can be profiled or only observed through its debugger. */
function modeFor(configuration) {
  if (configuration.request !== 'launch') return 'debugger';
  if (['node', 'pwa-node'].includes(configuration.type)) return 'node';
  return ['python', 'debugpy'].includes(configuration.type) ? 'python' : 'debugger';
}

/** Build explicit app launch choices from existing configurations and known framework conventions. */
function launchOptions(app, existing) {
  const framework = ['React', 'Next.js', 'Vite / JavaScript', 'VS Code extension'].includes(
    app.framework,
  );
  const python = ['FastAPI / Python', 'Flask / Python', 'Django / Python'].includes(app.framework);
  const options = existing.map((configuration) => ({
    label: configuration.name,
    description: 'Existing launch configuration',
    configuration,
  }));
  if (app.scripts?.dev || app.scripts?.start || app.scripts?.serve)
    options.unshift({
      label: 'Start development server',
      description: app.framework,
      action: 'server',
    });
  if (python)
    options.unshift({
      label: 'Start Python development server',
      description: app.framework,
      action: 'pythonServer',
    });
  if (framework && app.framework !== 'VS Code extension')
    options.push({
      label: 'Open browser debugger',
      description: 'Start the dev server first; highlights paused browser frames',
      action: 'browser',
    });
  const files = (app.entries || app.files || []).filter((file) =>
    ['.py', '.js', '.cjs', '.mjs'].includes(extname(file)),
  );
  if (!framework)
    for (const file of files.slice(0, 50)) options.push({ label: file, action: 'file', file });
  return options;
}

module.exports = { launchOptions, modeFor };
