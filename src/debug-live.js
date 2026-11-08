/** Observe debugger state; owned step stops may request UI focus preservation before VS Code processes the event. */
function observeDebugger(vscode, update, preserveFocus = () => false) {
  return vscode.debug.registerDebugAdapterTrackerFactory('*', {
    createDebugAdapterTracker(session) {
      let generation = 0;
      return {
        onDidSendMessage: async (message) => {
          if (message.type !== 'event') return;
          if (message.event === 'stopped' && preserveFocus(session)) {
            // DAP preserveFocusHint suppresses VS Code's automatic stack-frame/source-editor navigation.
            // Set it synchronously: tracker messages are forwarded to the workbench before our first await completes.
            message.body ||= {};
            message.body.preserveFocusHint = true;
          }
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
            await update(session, 'Paused', frames, { threadId, reason: message.body?.reason });
          } catch {
            if (generation === current) update(session, 'Stack unavailable', []);
          }
        },
      };
    },
  });
}

module.exports = { observeDebugger };
