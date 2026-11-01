/** Keep only bounded, numeric runtime data from the local tracer; ignore arbitrary payloads. */
function ingest(state, message) {
  if (message.type === 'log') {
    if (
      typeof message.uri !== 'string' ||
      !message.uri.startsWith('file:') ||
      !Number.isInteger(message.position?.line) ||
      message.position.line < 0 ||
      !Number.isInteger(message.position.character) ||
      message.position.character < 0 ||
      !['info', 'warning', 'error'].includes(message.level) ||
      typeof message.text !== 'string'
    )
      return;
    state.logs ||= [];
    if (
      state.logs.some(
        (entry) =>
          entry.uri === message.uri &&
          entry.time === message.time &&
          entry.level === message.level &&
          entry.text === message.text.slice(0, 4000),
      )
    )
      return;
    if (state.logs.length >= 500 && message.level === 'error') state.logs.shift();
    if (state.logs.length < 500)
      state.logs.push({
        uri: message.uri,
        position: message.position,
        level: message.level,
        text: message.text.slice(0, 4000),
        time: Number.isFinite(message.time) ? message.time : Date.now(),
      });
    return;
  }
  if (message.type === 'logCaptureError') {
    state.logError = 'Runtime log capture unavailable';
    return;
  }
  if (message.type === 'error') {
    state.status = 'Tracing failed';
    return;
  }
  if (message.type !== 'metrics' || !Array.isArray(message.records)) return;
  for (const record of message.records.slice(0, 10000)) {
    if (
      typeof record.uri !== 'string' ||
      !record.uri.startsWith('file:') ||
      !Number.isInteger(record.position?.line) ||
      record.position.line < 0 ||
      !Number.isInteger(record.position.character) ||
      record.position.character < 0 ||
      !Number.isFinite(record.calls) ||
      record.calls < 0 ||
      !Number.isFinite(record.cpuMs) ||
      record.cpuMs < 0
    )
      continue;
    const key = JSON.stringify([record.uri, record.position]);
    const prior = state.records.get(key);
    if (!prior && state.records.size >= 10000) continue;
    state.records.set(key, {
      ...record,
      calls: (prior?.calls || 0) + record.calls,
      cpuMs: (prior?.cpuMs || 0) + record.cpuMs,
      lastSeen: record.calls > 0 ? Date.now() : prior?.lastSeen,
    });
  }
}

module.exports = { ingest };
