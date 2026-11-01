/** Explain a stale extension host before sending commands it cannot handle. */
function liveSupportError(graph) {
  return graph.capabilities?.live === true
    ? undefined
    : 'Restart Extension Development Host: stop its debug session in the original VS Code window, then press F5.';
}

module.exports = { liveSupportError };
