const { EventEmitter } = require('node:events');
const { openRuntimePipe } = require('./runtime-pipe');
const { ingest } = require('./runtime-data');
const { observeDebugger } = require('./debug-live');
const { chooseLaunch } = require('./launch-targets');
const { profiledConfiguration } = require('./launch-profile');
const { createStepRun } = require('./step-run');
const { installStepBreakpoints } = require('./step-breakpoints');
const { keepStepFocus } = require('./step-focus');
const { StepSetupError } = require('./step-error');

/** Launch supported app runtimes and observe debugger frames without silently claiming unsupported profiling. */
function createLive(vscode, context) {
  const events = new EventEmitter();
  const state = { status: 'Not running', frames: [], records: new Map(), logs: [] };
  let pipe;
  let sessionId;
  let rootSession;
  let observedId;
  let launching = false;
  let breakpoints;
  let focus;
  let revealStep;
  let focusRestore = Promise.resolve();
  const cleanupStep = () => {
    breakpoints?.dispose();
    breakpoints = undefined;
    revealStep = undefined;
    if (focus) {
      const previous = focus;
      focus = undefined;
      focusRestore = previous.dispose().catch(() => {
        vscode.window.showErrorMessage(
          'Could not restore debug.focusEditorOnBreak. Restore it in workspace settings.',
        );
      });
    }
  };
  const notify = () => events.emit('change');
  const stepping = createStepRun(state, notify);
  const adoptSession = (session) => {
    if (session.configuration?.visualizeLive && !sessionId) {
      sessionId = session.id;
      observedId = session.id;
      rootSession = session;
    }
  };
  const observer = observeDebugger(
    vscode,
    async (session, status, frames, detail) => {
      adoptSession(session);
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
        status === 'Running' && state.step
          ? 'Stepping to next function…'
          : status === 'Running' && state.profileMode === 'debugger'
            ? 'Running (debugger highlights on pause)'
            : status;
      state.frames = frames;
      if (state.step && related) {
        if (status === 'Finished') {
          stepping.finish();
          cleanupStep();
        } else if (status === 'Running') state.step.canNext = false;
        else if (status === 'Paused' && (await stepping.stopped(session, frames, detail))) return;
      }
      notify();
      if (status === 'Paused' && state.step?.canNext) revealStep?.();
    },
    (session) => {
      if (!state.step || state.step.finished) return false;
      for (let owner = session; owner; owner = owner.parentSession)
        if (owner.configuration?.visualizeStep) return true;
      return false;
    },
  );
  const started = vscode.debug.onDidStartDebugSession(adoptSession);
  const ended = vscode.debug.onDidTerminateDebugSession((session) => {
    if (session.id !== sessionId) return;
    pipe?.flushCrash();
    state.status =
      state.step && !state.step.count
        ? 'Finished without hitting automatic breakpoints. Check the launch target and source maps.'
        : 'Finished';
    state.frames = [];
    stepping.finish();
    cleanupStep();
    notify();
    pipe?.dispose();
    pipe = undefined;
    sessionId = undefined;
    rootSession = undefined;
  });
  const start = async (uri, app, stepGraph, reveal) => {
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
    if (stepGraph && !stepGraph.items.size) {
      reject('Discover functions in this map before starting Step run.');
      return;
    }
    launching = true;
    let stage = 'selecting the launch target';
    try {
      const target = await chooseLaunch(vscode, uri, app);
      if (!target) return;
      if (pipe || sessionId) {
        if (stepGraph || state.step) {
          reject('Stop the current live session before starting another.');
          return;
        }
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
      state.profileMode = stepGraph ? 'debugger' : target.mode;
      state.frames = [];
      state.status = 'Starting live run';
      stepping.reset();
      await focusRestore;
      if (stepGraph) {
        stage = 'installing automatic function breakpoints';
        breakpoints = await installStepBreakpoints(vscode, stepGraph);
        stage = 'keeping focus in the visualizer';
        focus = await keepStepFocus(vscode, target.folder?.uri);
        stepping.prepare(stepGraph, breakpoints.items);
        state.step.breakpoints = breakpoints.count;
        state.step.warning = breakpoints.skipped.length
          ? `Automatic breakpoints unavailable for: ${breakpoints.skipped.slice(0, 8).join(', ')}${breakpoints.skipped.length > 8 ? '…' : ''}`
          : undefined;
        revealStep = reveal;
      }
      notify();
      if (target.mode !== 'debugger' && !stepGraph)
        pipe = await openRuntimePipe((message) => {
          ingest(state, message);
          notify();
        });
      stage = `starting the ${target.configuration.type} debugger`;
      const ok = await vscode.debug.startDebugging(
        target.folder,
        {
          ...profiledConfiguration(vscode, context, target, pipe),
          ...(stepGraph
            ? {
                stopOnEntry: false,
                noDebug: false,
                internalConsoleOptions: 'neverOpen',
                visualizeStep: true,
              }
            : {}),
        },
        stepGraph ? { suppressDebugView: true, suppressDebugToolbar: true } : undefined,
      );
      if (!ok) throw new Error('launch rejected');
      if (state.status === 'Starting live run')
        state.status =
          target.mode === 'debugger' ? 'Running (debugger highlights on pause)' : 'Running';
      notify();
    } catch (error) {
      stepping.reset();
      cleanupStep();
      pipe?.dispose();
      pipe = undefined;
      sessionId = undefined;
      state.status =
        error instanceof StepSetupError
          ? error.message
          : `Could not start live run while ${stage}.`;
      notify();
      vscode.window.showErrorMessage(
        error instanceof StepSetupError
          ? state.status
          : `${state.status} Check the selected interpreter/runtime and debugger extension.`,
      );
    } finally {
      launching = false;
    }
  };
  return {
    state,
    start,
    next: stepping.next,
    stop: async () => {
      if (rootSession) await vscode.debug.stopDebugging(rootSession);
    },
    subscribe: (listener) => {
      events.on('change', listener);
      return { dispose: () => events.off('change', listener) };
    },
    dispose: () => {
      observer.dispose();
      cleanupStep();
      stepping.reset();
      started.dispose();
      ended.dispose();
      pipe?.dispose();
      events.removeAllListeners();
    },
  };
}

module.exports = { createLive };
