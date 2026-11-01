import React from 'react';

/** Mark local Big-O heuristics as estimates and expose their assumptions in a tooltip. */
export function ComplexityBadge({ complexity }) {
  return (
    <span className="complexity-badge" title={complexity?.reason || 'Not yet analyzed'}>
      {complexity?.notation && complexity.notation !== 'Unknown'
        ? `~${complexity.notation}`
        : 'Big-O: Unknown'}
      <span className="complexity-caption"> local estimate</span>
    </span>
  );
}
