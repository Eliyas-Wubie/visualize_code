/** Normalize file URLs so Node.js and VS Code agree on escaping and Windows path casing. */
function normalizeUri(uri) {
  try {
    const parsed = new URL(uri);
    const path = `${parsed.host}${decodeURIComponent(parsed.pathname)}`;
    return process.platform === 'win32' ? path.toLowerCase() : path;
  } catch {
    return uri;
  }
}

/** Match source positions; entryOnly prevents unknown nested functions being counted as their parent. */
function matchFunction(graph, uri, position, entryOnly = false) {
  let best;
  let size = Infinity;
  for (const [id, item] of graph.items) {
    if (normalizeUri(item.uri.toString()) !== normalizeUri(uri)) continue;
    const range = item.range || item.selectionRange;
    const end = (entryOnly ? item.selectionRange?.end : range.end) || range.start;
    const afterStart =
      position.line > range.start.line ||
      (position.line === range.start.line && position.character >= range.start.character);
    const beforeEnd =
      position.line < end.line ||
      (position.line === end.line && position.character <= end.character);
    const span = (end.line - range.start.line) * 100000 + end.character - range.start.character;
    if (afterStart && beforeEnd && span < size) {
      best = id;
      size = span;
    }
  }
  return best;
}

/** Project collected runtime counts, sampled CPU time, and paused stack onto a static graph. */
function liveSnapshot(graph, state) {
  const metrics = {};
  for (const record of state.records.values()) {
    const id = matchFunction(graph, record.uri, record.position, true);
    if (!id) continue;
    const metric = (metrics[id] ||= { calls: 0, cpuMs: 0 });
    metric.calls += record.calls || 0;
    metric.cpuMs += record.cpuMs || 0;
    metric.lastSeen = Math.max(metric.lastSeen || 0, record.lastSeen || 0);
  }
  const stackGraph = state.stepItems ? { items: state.stepItems } : graph;
  const stack = state.frames.map((frame) => matchFunction(stackGraph, frame.uri, frame.position));
  const logs = {};
  const unmatchedLogs = [];
  for (const entry of state.logs || []) {
    const id = matchFunction(graph, entry.uri, entry.position);
    if (id) (logs[id] ||= []).push(entry);
    else unmatchedLogs.push(entry);
  }
  const active = stack.filter(Boolean);
  const edges = [];
  for (let i = 1; i < stack.length; i++) {
    if (stack[i] && stack[i - 1]) edges.push({ from: stack[i], to: stack[i - 1] });
  }
  return {
    type: 'live',
    status: state.status,
    metrics,
    active,
    current: stack[0],
    currentName: graph.nodes?.get(stack[0])?.name,
    edges,
    logs,
    unmatchedLogs,
    logError: state.logError,
    timing: state.timing,
    countLabel: state.countLabel,
    profileMode: state.profileMode,
    step: state.step,
  };
}

module.exports = { matchFunction, liveSnapshot };
