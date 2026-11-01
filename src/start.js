const vscode = require('vscode');

/** Resolve a starting function at the cursor or through the active file's symbol picker. */
async function chooseStart(pick) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage('Open a source file first.');
    return;
  }
  let position = editor.selection.active;
  if (pick) {
    const symbols = await vscode.commands.executeCommand(
      'vscode.executeDocumentSymbolProvider',
      editor.document.uri,
    );
    const options = [];
    const visit = (entries, parent = '') => {
      for (const symbol of entries || []) {
        const path = parent ? `${parent} › ${symbol.name}` : symbol.name;
        if (
          [
            vscode.SymbolKind.Function,
            vscode.SymbolKind.Method,
            vscode.SymbolKind.Constructor,
          ].includes(symbol.kind)
        ) {
          options.push({
            label: symbol.name,
            description: path,
            position: (symbol.selectionRange || symbol.location?.range || symbol.range).start,
          });
        }
        visit(symbol.children, path);
      }
    };
    visit(symbols);
    if (!options.length) {
      vscode.window.showInformationMessage(
        'No functions found. Try Trace from Cursor or enable language support.',
      );
      return;
    }
    const selected = await vscode.window.showQuickPick(options, {
      placeHolder: 'Choose the starting function',
    });
    if (!selected) return;
    position = selected.position;
  }
  const items = await vscode.commands.executeCommand(
    'vscode.prepareCallHierarchy',
    editor.document.uri,
    position,
  );
  if (!items?.length) {
    vscode.window.showInformationMessage(
      'No call hierarchy here. Place the cursor on a function and enable a language extension with call hierarchy support.',
    );
    return;
  }
  if (items.length === 1) return items[0];
  const selected = await vscode.window.showQuickPick(
    items.map((item) => ({ label: item.name, description: item.detail, item })),
    { placeHolder: 'Choose the starting function' },
  );
  return selected?.item;
}

module.exports = { chooseStart };
