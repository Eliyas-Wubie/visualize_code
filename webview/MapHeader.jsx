import React from 'react';
import { DetectionHelp } from './DetectionHelp';
import { Icon } from './Icon';

/** Display app context, graph mode controls, and visible node/connection counts. */
export function MapHeader({ app, mode, setMode, count, connections, locked, startingPoint }) {
  return (
    <header>
      <span className="brand-mark">
        <Icon name="flow" size={22} />
      </span>
      <div className="flow-title">
        <span className="eyebrow">CODE EXECUTION VISUALIZER</span>
        <h1>
          {app?.name || startingPoint || 'Execution map'}
          <span className="flow-subtitle">
            {' '}
            /{' '}
            {mode === 'architecture'
              ? 'Architecture map (estimated)'
              : mode === 'files'
                ? 'File map'
                : mode === 'oop'
                  ? 'Class map'
                  : 'Function map'}
          </span>
        </h1>
      </div>
      <div className="mode-toggle" role="group" aria-label="Map mode">
        <button
          disabled={locked}
          aria-pressed={mode === 'functions'}
          onClick={() => setMode('functions')}
        >
          Functions
        </button>
        <button disabled={locked} aria-pressed={mode === 'oop'} onClick={() => setMode('oop')}>
          OOP
        </button>
        <button disabled={locked} aria-pressed={mode === 'files'} onClick={() => setMode('files')}>
          Files
        </button>
        <button
          disabled={locked}
          aria-pressed={mode === 'architecture'}
          onClick={() => setMode('architecture')}
        >
          Architecture
        </button>
      </div>
      <span className="stats">
        {count}{' '}
        {mode === 'architecture'
          ? 'areas'
          : mode === 'files'
            ? 'files'
            : mode === 'oop'
              ? 'classes'
              : 'functions'}{' '}
        / {connections} connections
      </span>
      <DetectionHelp />
    </header>
  );
}
