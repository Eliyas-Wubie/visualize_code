const { EventEmitter } = require('node:events');
const { openRuntimePipe } = require('./runtime-pipe');
const { ingest } = require('./runtime-data');
const { observeDebugger } = require('./debug-live');
const { chooseLaunch } = require('./launch-targets');
const { profiledConfiguration } = require('./launch-profile');

/** Launch supported app runtimes and observe debugger frames without silently claiming unsupported profiling. */
function createLive(vscode, context) {
  const events = new EventEmitter();
  const state = { status: 'Not running', frames: [], records: new Map(), logs: [] };
  let pipe;
  let sessionId;
  let rootSession;
  let observedId;
  let launching = false;
  const notify = () => events.emit('change');
  const observer = observeDebugger(vscode, (session, status, frames) => {
    let related = session;
    while (related && related.id !== sessionId) related = related.parentSession;
    if (sessionId && !related) return;
    if (status === 'Finished' && sessionId && session.id !== sessionId) return;
    if (!sessionId && observedId !== session.id) {
      state.records.clear();
      state.logs = [];
      observedId = session.id;
    }
    state.status =
      status === 'Running' && state.profileMode === 'debugger'
        ? 'Running (debugger highlights on pause)'
        : status;
    state.frames = frames;
    notify();
  });
  const started = vscode.debug.onDidStartDebugSession((session) => {
    if (session.configuration?.visualizeLive && !sessionId) {
      sessionId = session.id;
      observedId = session.id;
      rootSession = session;
    }
  });
  const ended = vscode.debug.onDidTerminateDebugSession((session) => {
    if (session.id !== sessionId) return;
    pipe?.flushCrash();
    state.status = 'Finished';
    state.frames = [];
    notify();
    pipe?.dispose();
    pipe = undefined;
    sessionId = undefined;
    rootSession = undefined;
  });
  const start = async (uri, app) => {
    const reject = (message) => {
      state.status = message;
      notify();
      vscode.window.showInformationMessage(message);
    };
    if (launching) {
      reject('A live launch is already in progress.');
      return;
    }
    if (!vscode.workspace.isTrusted) {
      reject('Trust this workspace before executing code.');
      return;
    }
    if (!uri || uri.scheme !== 'file') {
      reject('Open a local source file or application map first.');
      return;
    }
    launching = true;
    try {
      const target = await chooseLaunch(vscode, uri, app);
      if (!target) return;
      if (pipe || sessionId) {
        if (target.mode === 'debugger' && target.configuration.type === 'pwa-chrome') {
          try {
            const ok = await vscode.debug.startDebugging(
              target.folder,
              profiledConfiguration(vscode, context, target),
              { parentSession: rootSession },
            );
            if (!ok) reject('Could not start the browser debugger; the server is still running.');
          } catch {
            reject('Could not start the browser debugger; the server is still running.');
          }
        } else reject('Stop the current live session before starting another.');
        return;
      }
      state.records.clear();
      state.logs = [];
      state.logError = undefined;
      state.timing = target.mode === 'python' ? 'elapsed self' : 'sampled CPU';
      state.countLabel = target.mode === 'python' ? 'entries' : 'calls';
      state.profileMode = target.mode;
      state.frames = [];
      state.status = 'Starting live run';
      notify();
      if (target.mode !== 'debugger')
        pipe = await openRuntimePipe((message) => {
          ingest(state, message);
          notify();
        });
      const ok = await vscode.debug.startDebugging(
        target.folder,
        profiledConfiguration(vscode, context, target, pipe),
      );
      if (!ok) throw new Error('launch rejected');
      if (state.status === 'Starting live run')
        state.status =
          target.mode === 'debugger' ? 'Running (debugger highlights on pause)' : 'Running';
      notify();
    } catch {
      pipe?.dispose();
      pipe = undefined;
      sessionId = undefined;
      state.status = 'Could not start live tracing';
      notify();
      vscode.window.showErrorMessage(
        'Could not start live run. Check the app launch configuration, runtime, and debugger extension (Python requires Python Debugger).',
      );
    } finally {
      launching = false;
    }
  };
  return {
    state,
    start,
    subscribe: (listener) => {
      events.on('change', listener);
      return { dispose: () => events.off('change', listener) };
    },
    dispose: () => {
      observer.dispose();
      started.dispose();
      ended.dispose();
      pipe?.dispose();
      events.removeAllListeners();
    },
  };
}

module.exports = { createLive };
