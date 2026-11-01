import React from 'react';
import { DetectionHelp } from './DetectionHelp';

/** Display app context, graph mode controls, and visible node/connection counts. */
export function MapHeader({ app, mode, setMode, count, connections }) {
  return (
    <header>
      <div>
        <span className="eyebrow">PROJECT EXECUTION VISUALIZER</span>
        <h1>
          {app ? `${app.name} / ` : ''}
          {mode === 'oop' ? 'Class map' : 'Function map'}
        </h1>
      </div>
      <div className="mode-toggle" role="group" aria-label="Map mode">
        <button aria-pressed={mode === 'functions'} onClick={() => setMode('functions')}>
          Functions
        </button>
        <button aria-pressed={mode === 'oop'} onClick={() => setMode('oop')}>
          OOP
        </button>
      </div>
      <span className="stats">
        {count} {mode === 'oop' ? 'classes' : 'functions'} / {connections} connections
      </span>
      <DetectionHelp />
    </header>
  );
}
