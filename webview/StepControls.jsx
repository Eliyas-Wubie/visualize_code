import React from 'react';
import { Icon } from './Icon';

/** Reserve a stable execution-control area so runtime updates never resize the canvas. */
export function StepControls({ live, next, stop }) {
  const step = live.step;
  return (
    <section
      className="step-controls"
      aria-label="Step execution"
      data-state={!step ? 'idle' : step.finished ? 'finished' : step.canNext ? 'paused' : 'running'}
    >
      <div className="step-buttons">
        <button className="button-primary" onClick={next} disabled={!step?.canNext}>
          <Icon name="step" />
          Next
        </button>
        <button onClick={stop} disabled={!step || step.finished}>
          <Icon name="stop" />
          Stop
        </button>
      </div>
      <div className="step-status">
        <strong role="status">
          {step ? live.status : 'Start Step run to pause at functions.'}
        </strong>
        <div className="step-progress">
          {live.currentName && <span>Current: {live.currentName}</span>}
          <span>
            Pause {step?.count || 0} · {step?.visited.length || 0} functions visited
          </span>
          {step?.breakpoints != null && <span>{step.breakpoints} automatic breakpoints</span>}
        </div>
        {step?.warning && <span role="alert">{step.warning}</span>}
      </div>
      <span className="step-legend">
        <span>Paused</span>
        <span>Call stack</span>
        <span>Visited</span>
      </span>
    </section>
  );
}
