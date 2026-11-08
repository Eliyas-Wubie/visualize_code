import React from 'react';
import { Icon } from './Icon';
import { NodeEditButton } from './NodeEditButton';

/** Give source cards a shared category header without changing selection or editing authority. */
export function NodeHeading({ data, kind, label }) {
  return (
    <div className={`node-heading category-${kind}`}>
      <span className="category-icon">
        <Icon name={kind} size={14} />
      </span>
      <span className="node-kind">{label}</span>
      {data.root && <span className="entry-badge">Entry</span>}
      <NodeEditButton data={data} />
    </div>
  );
}
