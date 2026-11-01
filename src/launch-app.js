const { launchOptions, modeFor } = require('./launch-options');
const { pythonServer } = require('./launch-python');

/** Ask for an app launch action and resolve it without execution; return a file URI or a launch target. */
async function chooseAppTarget(vscode, app, existing, folder, cwd) {
  const options = launchOptions(app, existing);
  if (!options.length)
    throw new Error('No launch target. Add a VS Code launch configuration for this app.');
  const selected = await vscode.window.showQuickPick(options, {
    placeHolder: 'Choose how to run this application',
  });
  if (!selected) return;
  if (selected.configuration)
    return {
      folder,
      cwd,
      mode: modeFor(selected.configuration),
      configuration: { ...selected.configuration },
    };
  if (selected.action === 'file')
    return { uri: vscode.Uri.joinPath(app.folder.uri, selected.file) };
  if (selected.action === 'pythonServer') {
    const configuration = await pythonServer(vscode, app);
    return configuration && { folder, cwd, mode: 'python', configuration };
  }
  if (selected.action === 'server') {
    const script = ['dev', 'start', 'serve'].find((name) => app.scripts[name]);
    return {
      folder,
      cwd,
      mode: 'node',
      configuration: {
        type: 'node',
        request: 'launch',
        runtimeExecutable: app.packageManager || 'npm',
        runtimeArgs: ['run', script],
        autoAttachChildProcesses: true,
      },
    };
  }
  if (selected.action !== 'browser') throw new Error('Unknown app launch action');
  const url = await vscode.window.showInputBox({
    prompt: 'Local development server URL',
    value: app.framework === 'Next.js' ? 'http://localhost:3000' : 'http://localhost:5173',
    validateInput: (value) => {
      try {
        return ['http:', 'https:'].includes(new URL(value).protocol)
          ? undefined
          : 'Use an HTTP or HTTPS URL.';
      } catch {
        return 'Enter a valid URL.';
      }
    },
  });
  if (!url) return;
  return {
    folder,
    cwd,
    mode: 'debugger',
    configuration: { type: 'pwa-chrome', request: 'launch', url, webRoot: cwd },
  };
}

module.exports = { chooseAppTarget };
