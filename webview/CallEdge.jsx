import React from 'react';
import { BaseEdge, getBezierPath } from '@xyflow/react';

/** Draw directed calls, including a loop to the right for recursive functions. */
export function CallEdge(props) {
  const { sourceX: x, sourceY: y, targetX: tx, targetY: ty } = props;
  const path =
    props.source === props.target
      ? `M ${x} ${y} C ${x + 260} ${y + 100}, ${tx + 260} ${ty - 100}, ${tx} ${ty}`
      : getBezierPath({ ...props, curvature: 0.35 })[0];
  return (
    <g>
      <title>Calls at line {props.data.lines.join(', ')}</title>
      <BaseEdge
        id={props.id}
        path={path}
        markerEnd={props.markerEnd}
        style={props.style}
        label={props.label}
        labelX={(x + tx) / 2}
        labelY={(y + ty) / 2}
      />
    </g>
  );
}
