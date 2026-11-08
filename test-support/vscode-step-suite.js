const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const vscode = require('vscode');
const { createLive } = require('../src/live');
const { liveSnapshot } = require('../src/live-match');
const { CallGraph } = require('../src/graph');
const { scanApp } = require('../src/app-scan');
const { chooseMapRoot } = require('../src/map-root');
const { layout } = require('../webview/layout');

/** Exercise the real VS Code launch providers, breakpoint API and Next bridge against an isolated synthetic workspace. */
async function run() {
  const folder = vscode.workspace.workspaceFolders[0];
  const notices = [];
  const host = {
    workspace: vscode.workspace,
    debug: vscode.debug,
    Uri: vscode.Uri,
    RelativePattern: vscode.RelativePattern,
    commands: vscode.commands,
    Location: vscode.Location,
    SourceBreakpoint: vscode.SourceBreakpoint,
    ConfigurationTarget: vscode.ConfigurationTarget,
    window: {
      showErrorMessage: (message) => notices.push(message),
      showInformationMessage: (message) => notices.push(message),
    },
  };
  const live = createLive(host, { extensionUri: vscode.Uri.file(path.resolve(__dirname, '..')) });
  const results = [];
  let providerItems;
  const wait = async (predicate) => {
    for (let i = 0; i < 400; i++) {
      if (predicate()) return;
      if (live.state.status.startsWith('Could not') || notices.length)
        throw new Error(`${live.state.status} ${notices.join(' ')}`);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`VS Code step timeout: ${live.state.status}`);
  };
  try {
    for (const extension of ['py', 'cjs']) {
      const uri = vscode.Uri.joinPath(folder.uri, `main.${extension}`);
      await vscode.workspace.openTextDocument(uri);
      if (extension === 'py')
        await vscode.extensions.getExtension('ms-python.vscode-pylance').activate();
      let symbols;
      for (let i = 0; i < 200 && !symbols?.length; i++) {
        symbols = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', uri);
        if (!symbols?.length) await new Promise((resolve) => setTimeout(resolve, 100));
      }
      assert(symbols?.length, `No real provider symbols for ${extension}`);
      const graph = new CallGraph(
        async (item) => vscode.commands.executeCommand('vscode.provideOutgoingCalls', item),
        (uri) => uri.fsPath,
      );
      await scanApp(
        vscode,
        { folder, files: [`main.${extension}`] },
        graph,
        { isCancellationRequested: false },
        { report() {} },
      );
      assert.equal(graph.items.size, 3);
      providerItems = [...graph.items.values()].map(({ name, kind, range, selectionRange }) => ({
        name,
        kind,
        range,
        selectionRange,
      }));
      const before = vscode.debug.breakpoints.length;
      const flow = vscode.window.createWebviewPanel(
        'stepFocusAcceptance',
        'Execution flow',
        vscode.ViewColumn.Active,
        {},
      );
      flow.webview.html = '<h1>Execution flow</h1>';
      const sourceTabs = [];
      const tabListener = vscode.window.tabGroups.onDidChangeTabs((event) => {
        for (const tab of [...event.opened, ...event.changed])
          if (
            tab.input instanceof vscode.TabInputText &&
            tab.input.uri.toString() === uri.toString()
          )
            sourceTabs.push(tab.label);
      });
      let reveals = 0;
      await live.start(uri, undefined, graph, () => {
        reveals++;
        flow.reveal(flow.viewColumn, false);
      });
      const seen = [];
      for (const expected of ['main', 'twice', 'twice', 'recurse', 'recurse', 'recurse']) {
        await wait(() => live.state.step?.canNext && live.state.step.count === seen.length + 1);
        const snapshot = liveSnapshot(graph, live.state);
        assert.equal(snapshot.currentName, expected);
        assert.equal(vscode.debug.breakpoints.length, before + 3);
        assert.equal(vscode.workspace.getConfiguration('debug').get('focusEditorOnBreak'), false);
        // Allow VS Code's asynchronous stopped-event UI handler to settle before checking that no source tab was opened.
        await new Promise((resolve) => setTimeout(resolve, 100));
        assert.equal(
          flow.active,
          true,
          `Execution flow lost focus during ${extension} ${expected}`,
        );
        assert.deepEqual(sourceTabs, [], `Debugger opened a source tab during ${extension}`);
        seen.push(expected);
        await live.next();
      }
      await wait(() => live.state.step?.finished);
      await wait(() => vscode.debug.breakpoints.length === before);
      assert.equal(reveals, 6);
      tabListener.dispose();
      flow.dispose();
      results.push({ extension, seen, sourceTabsOpened: sourceTabs.length });
    }
    const classUri = vscode.Uri.joinPath(folder.uri, 'class_main.py');
    await vscode.workspace.openTextDocument(classUri);
    let classSymbols;
    for (let i = 0; i < 200 && !classSymbols?.length; i++) {
      classSymbols = await vscode.commands.executeCommand(
        'vscode.executeDocumentSymbolProvider',
        classUri,
      );
      if (!classSymbols?.length) await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert(classSymbols?.length, 'Python class sample must provide symbols');
    const classGraph = new CallGraph(
      async (item) => vscode.commands.executeCommand('vscode.provideOutgoingCalls', item),
      (uri) => uri.fsPath,
    );
    await scanApp(
      vscode,
      { folder, files: ['class_main.py'] },
      classGraph,
      { isCancellationRequested: false },
      { report() {} },
    );
    const classRoot = chooseMapRoot(classGraph, [classUri]);
    assert.equal(classRoot.name, 'main');
    for (let index = 0; index < classGraph.nodes.size; index++) {
      const node = [...classGraph.nodes.values()][index];
      if (!node.loaded) await classGraph.expand(node.id);
    }
    const rootId = [...classGraph.items].find(([, item]) => item === classRoot)[0];
    const classView = layout({ ...classGraph.snapshot(), root: rootId });
    const classPositions = new Map(
      classView.nodes.map((node) => [node.data.name, node.position.y]),
    );
    assert(classPositions.get('tick') > classPositions.get('main'));
    assert(classPositions.get('calculate') > classPositions.get('tick'));
    results.push({
      case: 'python-class-layout',
      root: classRoot.name,
      levels: Object.fromEntries(classPositions),
    });
    await fs.writeFile(
      path.join(folder.uri.fsPath, 'results.json'),
      JSON.stringify({ results, notices }, null, 2),
    );
  } catch (error) {
    await fs.writeFile(
      path.join(folder.uri.fsPath, 'results.json'),
      JSON.stringify({ error: error.message, results, notices, providerItems }, null, 2),
    );
    throw error;
  } finally {
    await live.stop();
    live.dispose();
  }
}

module.exports = { run };
