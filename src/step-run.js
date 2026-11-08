const { matchFunction } = require('./live-match');

/** Hold every breakpoint pause until Next continues the retained session; never auto-step source statements. */
function createStepRun(state, notify) {
  let graph;
  let paused;
  let generation = 0;
  const reset = () => {
    generation++;
    graph = undefined;
    paused = undefined;
    state.step = undefined;
    state.stepItems = undefined;
  };
  const advance = async (session, threadId) => {
    const step = state.step;
    const token = ++generation;
    paused = undefined;
    state.step.canNext = false;
    state.status = 'Stepping to next function…';
    notify();
    try {
      await session.customRequest('continue', { threadId, singleThread: false });
    } catch {
      if (state.step !== step || generation !== token) return;
      paused = { session, threadId };
      state.step.canNext = true;
      state.status = 'Debugger could not advance. Retry Next or stop debugging.';
      notify();
    }
  };
  return {
    reset,
    finish() {
      generation++;
      graph = undefined;
      state.stepItems = undefined;
      paused = undefined;
      if (state.step) {
        state.step.canNext = false;
        state.step.finished = true;
      }
    },
    prepare(value, items = value.items) {
      reset();
      graph = { ...value, items };
      state.stepItems = items;
      state.step = { canNext: false, count: 0, visited: [] };
    },
    async stopped(session, frames, detail) {
      if (!graph || detail?.threadId === undefined) return false;
      const stack = frames.map((frame) => matchFunction(graph, frame.uri, frame.position));
      const current = stack[0];
      paused = { session, threadId: detail.threadId };
      state.step.canNext = true;
      state.step.count++;
      if (current && !state.step.visited.includes(current)) state.step.visited.push(current);
      state.status =
        detail.reason === 'exception'
          ? 'Paused on exception - Next to continue'
          : current
            ? 'Paused at function - Next to continue'
            : 'Paused at breakpoint outside mapped code - Next to continue';
      return false;
    },
    async next() {
      if (!paused || !state.step?.canNext) return;
      const { session, threadId } = paused;
      await advance(session, threadId);
    },
  };
}

module.exports = { createStepRun };
