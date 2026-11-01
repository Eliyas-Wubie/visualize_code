const { pathToFileURL } = require('node:url');

/** Add local profiling to supported runtimes while preserving existing launch environment options. */
function profiledConfiguration(vscode, context, target, pipe) {
  const configuration = {
    ...target.configuration,
    name: target.configuration.name || 'Visualize Code: Run live',
    cwd: target.configuration.cwd || target.cwd,
    console: target.configuration.console || 'internalConsole',
    visualizeLive: true,
  };
  if (!pipe) return configuration;
  const inherited = target.configuration.env || {};
  configuration.env = {
    ...inherited,
    VISUALIZE_ENDPOINT: pipe.endpoint,
    VISUALIZE_TOKEN: pipe.token,
    VISUALIZE_CRASH_FILE: pipe.crashFile,
    VISUALIZE_ROOT: target.folder?.uri.fsPath || target.cwd,
  };
  if (target.mode === 'node') {
    const preload = pathToFileURL(
      vscode.Uri.joinPath(context.extensionUri, 'runtime', 'bootstrap.mjs').fsPath,
    ).href;
    configuration.env.NODE_OPTIONS =
      `${inherited.NODE_OPTIONS || process.env.NODE_OPTIONS || ''} --import=${preload}`.trim();
  } else if (target.mode === 'python') {
    const runner = vscode.Uri.joinPath(context.extensionUri, 'runtime', 'python', 'run.py').fsPath;
    configuration.args = [
      configuration.module ? '--module' : '--program',
      configuration.module || configuration.program,
      '--',
      ...(configuration.args || []),
    ];
    configuration.program = runner;
    delete configuration.module;
  }
  return configuration;
}

module.exports = { profiledConfiguration };
