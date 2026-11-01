/** Resolve a Python framework server configuration; cancellation returns undefined and missing manage.py throws. */
async function pythonServer(vscode, app) {
  const configuration = { type: 'debugpy', request: 'launch', justMyCode: true };
  if (app.framework === 'Django / Python') {
    const manage = app.files.find((file) => file.endsWith('/manage.py') || file === 'manage.py');
    if (!manage) throw new Error('Django requires manage.py or an existing launch configuration.');
    configuration.program = vscode.Uri.joinPath(app.folder.uri, manage).fsPath;
    configuration.args = ['runserver', '--noreload'];
    configuration.django = true;
  } else {
    const target = await vscode.window.showInputBox({
      prompt: 'Python application import target (module:object)',
      value: 'main:app',
    });
    if (!target) return;
    configuration.module = app.framework === 'FastAPI / Python' ? 'uvicorn' : 'flask';
    configuration.args =
      configuration.module === 'uvicorn'
        ? [target, '--host', '127.0.0.1']
        : ['--app', target, 'run', '--no-reload'];
  }
  return configuration;
}

module.exports = { pythonServer };
