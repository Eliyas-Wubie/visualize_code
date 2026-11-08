/** Wait for cold language providers without mistaking delayed symbols for an empty file. Cancellation and timeout reject explicitly. */
async function readySymbols(vscode, uri, document, token, progress, timeout = 30000) {
  const deadline = Date.now() + timeout;
  const source = document?.getText?.() || '';
  const mayDeclare = ['def ', 'class ', 'function', '=>', '('].some((part) =>
    source.includes(part),
  );
  while (true) {
    if (token.isCancellationRequested) throw new Error('Scan cancelled.');
    const request = vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', uri);
    const symbols = await new Promise((resolve, reject) => {
      const timer = setInterval(() => {
        if (token.isCancellationRequested || Date.now() >= deadline) {
          clearInterval(timer);
          reject(
            new Error(
              token.isCancellationRequested
                ? 'Scan cancelled.'
                : 'Language support is still starting. Retry after JavaScript/TypeScript or Python/Pylance is ready.',
            ),
          );
        }
      }, 100);
      request.then(resolve, reject).finally(() => clearInterval(timer));
    });
    if (symbols?.length || (Array.isArray(symbols) && !mayDeclare)) return symbols;
    if (Date.now() >= deadline)
      throw new Error(
        'Language support is still starting. Retry after JavaScript/TypeScript or Python/Pylance is ready.',
      );
    progress.report({ message: 'Waiting for language support…' });
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

module.exports = { readySymbols };
