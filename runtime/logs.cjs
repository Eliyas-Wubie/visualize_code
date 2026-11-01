const { pathToFileURL, fileURLToPath } = require('node:url');
const { isAbsolute, relative, sep } = require('node:path');
const { writeFileSync } = require('node:fs');

/** Capture console messages and uncaught errors without changing application logging or exception handling. */
function captureLogs(session, send, root, crashFile, token) {
  let remaining = 500;
  const location = (frame) => {
    try {
      const uri = frame.url.startsWith('file:')
        ? frame.url
        : isAbsolute(frame.url)
          ? pathToFileURL(frame.url).href
          : '';
      if (!uri) return;
      const path = relative(root, fileURLToPath(uri));
      if (path === '..' || path.startsWith(`..${sep}`) || isAbsolute(path)) return;
      return {
        uri,
        position: { line: frame.lineNumber, character: Math.max(0, frame.columnNumber) },
      };
    } catch {
      return;
    }
  };
  const emit = (level, text, frames, fatal = false) => {
    if (remaining <= 0 && !fatal) return;
    const source = frames.map(location).find(Boolean);
    if (!source) return;
    remaining--;
    const message = { type: 'log', level, text: text.slice(0, 4000), ...source, time: Date.now() };
    if (fatal && crashFile) {
      // Fatal exits can discard asynchronous pipe writes; retain one bounded record for host cleanup.
      try {
        writeFileSync(crashFile, JSON.stringify({ token, ...message }), { mode: 0o600 });
      } catch {
        /* Pipe delivery still attempted. */
      }
    }
    send(message);
  };
  const consoleMessage = ({ params }) => {
    const level = ['error', 'assert'].includes(params.type)
      ? 'error'
      : params.type === 'warning'
        ? 'warning'
        : 'info';
    const text = (params.args || [])
      .map((arg) =>
        arg.value !== undefined
          ? String(arg.value)
          : arg.description || arg.unserializableValue || arg.type,
      )
      .join(' ');
    const error = params.args?.find((arg) => arg.subtype === 'error');
    const origin = error ? errorFrames({ stack: error.description }) : [];
    emit(level, text, origin.length ? origin : params.stackTrace?.callFrames || []);
  };
  const exception = ({ params }) => {
    const details = params.exceptionDetails;
    emit(
      'error',
      details.exception?.description || details.text || 'Uncaught exception',
      details.stackTrace?.callFrames || [],
    );
  };
  const errorFrames = (error) =>
    String(error.stack || '')
      .split('\n')
      .slice(1, 30)
      .flatMap((line) => {
        // Match Node stack locations ending in file:line:column, with an optional function-name wrapper.
        const match = line.match(/^\s*at (?:.* \()?(.+):(\d+):(\d+)\)?$/);
        return match
          ? [
              {
                url: match[1],
                lineNumber: Number(match[2]) - 1,
                columnNumber: Number(match[3]) - 1,
              },
            ]
          : [];
      });
  const uncaught = (error) => emit('error', String(error.stack || error), errorFrames(error), true);
  const warning = (error) => emit('warning', String(error.stack || error), errorFrames(error));
  session.on('Runtime.consoleAPICalled', consoleMessage);
  session.on('Runtime.exceptionThrown', exception);
  process.on('uncaughtExceptionMonitor', uncaught);
  process.on('warning', warning);
  session.post('Runtime.enable', {}, (error) => {
    if (error) send({ type: 'logCaptureError' });
  });
  return () => {
    session.off('Runtime.consoleAPICalled', consoleMessage);
    session.off('Runtime.exceptionThrown', exception);
    process.off('uncaughtExceptionMonitor', uncaught);
    process.off('warning', warning);
  };
}

module.exports = { captureLogs };
