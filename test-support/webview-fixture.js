/** Serve a synthetic VS Code bridge for browser smoke checks; requests never read, edit or execute project source. */
function webviewFixture() {
  const graph = {
    type: 'graph',
    root: 'run',
    limit: 300,
    capabilities: { authoring: true, live: true },
    nodes: [
      {
        id: 'run',
        name: 'run',
        file: 'src/main.js',
        line: 1,
        loaded: true,
        documentation: 'Synthetic documentation for scrolling checks.\n'.repeat(80),
        parameters: '()',
        classInfo: null,
      },
      ...['left', 'right'].map((id) => ({
        id,
        name: id,
        file: 'src/main.js',
        line: 10,
        loaded: true,
        parameters: '()',
      })),
    ],
    edges: ['left', 'right'].map((to) => ({ from: 'run', to, lines: [1] })),
  };
  const source = {
    token: 'source',
    name: 'run',
    source: 'function run() {\n  return 1;\n}',
    language: 'javascript',
  };
  const catalog = {
    entries: [
      { id: 'root', path: '', kind: 'folder' },
      { id: 'file', path: 'src/main.js', kind: 'file' },
    ],
  };
  return `<!doctype html><html><head><link rel="stylesheet" href="/bundle.css"></head>
<body><div id="root"></div><script>
window.fixtureDelay = 0;
window.fixtureRequests = [];
window.fixtureSteps = 0;
window.acquireVsCodeApi = () => ({ postMessage(message) {
  const post = data => window.dispatchEvent(new MessageEvent('message', { data }));
  if (message.type === 'ready') setTimeout(() => post(${JSON.stringify(graph)}), 0);
  if (['startStep', 'nextStep', 'stopStep'].includes(message.type)) {
    if (message.type === 'startStep') {
      const graph = ${JSON.stringify(graph)};
      post({ ...graph, nodes: [graph.nodes[0], graph.nodes[2], graph.nodes[1]] });
    }
    const finished = message.type === 'stopStep';
    const stepping = message.type === 'nextStep';
    const count = ++window.fixtureSteps;
    const live = { type: 'live', status: finished ? 'Finished' : 'Paused at function',
      active: finished ? [] : ['run'], current: finished ? undefined : 'run', currentName: 'run',
      metrics: {}, edges: [], step: { count, canNext: !finished, finished, visited: ['run'] } };
    if (stepping) post({ ...live, status: 'Stepping to next function', step: { ...live.step, canNext: false } });
    setTimeout(() => post(live), stepping ? 150 : 0);
  }
  if (message.type === 'editorRequest') {
    window.fixtureRequests.push(message);
    const result = message.action === 'load' ? ${JSON.stringify(source)} :
      message.action === 'catalog' ? ${JSON.stringify(catalog)} :
      ['save', 'create'].includes(message.action) ? { applied: true, saved: true } : { classes: [] };
    setTimeout(() => post({ type: 'editorResult', requestId: message.requestId, result }), window.fixtureDelay);
  }
} });
</script><script src="/bundle.js"></script></body></html>`;
}

module.exports = { webviewFixture };
