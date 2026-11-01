/** Observe debugger pauses without adding breakpoints or interrupting normal execution. */
function observeDebugger(vscode, update) {
  let generation = 0;
  return vscode.debug.registerDebugAdapterTrackerFactory('*', {
    createDebugAdapterTracker(session) {
      return {
        onDidSendMessage: async (message) => {
          if (message.type !== 'event') return;
          if (message.event === 'continued' || message.event === 'terminated') {
            generation++;
            update(session, message.event === 'continued' ? 'Running' : 'Finished', []);
          }
          if (message.event !== 'stopped') return;
          const current = ++generation;
          try {
            let threadId = message.body?.threadId;
            if (threadId === undefined)
              threadId = (await session.customRequest('threads')).threads?.[0]?.id;
            if (threadId === undefined) return;
            const result = await session.customRequest('stackTrace', {
              threadId,
              startFrame: 0,
              levels: 100,
            });
            if (generation !== current) return;
            const frames = (result.stackFrames || []).map((frame) => ({
              uri: !frame.source?.path
                ? ''
                : frame.source.path.startsWith('file:')
                  ? vscode.Uri.parse(frame.source.path).toString()
                  : vscode.Uri.file(frame.source.path).toString(),
              position: { line: frame.line - 1, character: Math.max(0, (frame.column || 1) - 1) },
            }));
            update(session, 'Paused', frames);
          } catch {
            if (generation === current) update(session, 'Stack unavailable', []);
          }
        },
      };
    },
  });
}

module.exports = { observeDebugger };
