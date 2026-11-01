const { readFileSync } = require('node:fs');
const { fileURLToPath } = require('node:url');
const { relative, isAbsolute } = require('node:path');

/** Convert V8 coverage and CPU profiles to source-positioned metrics inside the chosen workspace. */
function collectRecords(coverage, profile, root) {
  const records = new Map();
  const allowed = (uri) => {
    if (!uri.startsWith('file:')) return false;
    const path = relative(root, fileURLToPath(uri));
    return path !== '..' && !path.startsWith(`..${require('node:path').sep}`) && !isAbsolute(path);
  };
  const add = (uri, position, calls, cpuMs) => {
    const key = JSON.stringify([uri, position]);
    const row = records.get(key) || { uri, position, calls: 0, cpuMs: 0 };
    row.calls += calls;
    row.cpuMs += cpuMs;
    records.set(key, row);
  };
  for (const script of coverage.result || []) {
    if (!allowed(script.url)) continue;
    let source;
    try {
      source = readFileSync(fileURLToPath(script.url), 'utf8');
    } catch {
      continue;
    }
    for (const fn of script.functions) {
      if (!fn.functionName || !fn.ranges[0]?.count) continue;
      const offset = fn.ranges[0].startOffset;
      const prefix = source.slice(0, offset);
      const line = prefix.split('\n').length - 1;
      const character = offset - prefix.lastIndexOf('\n') - 1;
      add(script.url, { line, character }, fn.ranges[0].count, 0);
    }
  }
  const nodes = new Map((profile.nodes || []).map((node) => [node.id, node.callFrame]));
  for (let i = 0; i < (profile.samples || []).length; i++) {
    const frame = nodes.get(profile.samples[i]);
    if (frame && allowed(frame.url) && frame.lineNumber >= 0) {
      add(
        frame.url,
        { line: frame.lineNumber, character: Math.max(0, frame.columnNumber) },
        0,
        (profile.timeDeltas?.[i] || 0) / 1000,
      );
    }
  }
  return [...records.values()].slice(0, 10000);
}

module.exports = { collectRecords };
