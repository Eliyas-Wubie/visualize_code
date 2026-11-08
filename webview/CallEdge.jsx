import React from 'react';
import { BaseEdge, getBezierPath } from '@xyflow/react';
import { returnPath } from './return-routes';

/** Draw directed calls, including a loop to the right for recursive functions. */
export function CallEdge(props) {
  const { sourceX: x, sourceY: y, targetX: tx, targetY: ty } = props;
  const [path, labelX, labelY] =
    props.source === props.target
      ? [
          `M ${x} ${y} C ${x + 260} ${y + 100}, ${tx + 260} ${ty - 100}, ${tx} ${ty}`,
          (x + tx) / 2 + 195,
          (y + ty) / 2,
        ]
      : props.data.returnRoute
        ? returnPath(x, y, tx, ty, props.data.returnRoute)
        : getBezierPath({ ...props, curvature: 0.35 });
  return (
    <g>
      <title>{props.label || `Calls at line ${props.data.lines.join(', ')}`}</title>
      <BaseEdge
        id={props.id}
        path={path}
        markerEnd={props.markerEnd}
        style={props.style}
        label={props.label}
        labelX={labelX}
        labelY={labelY}
        labelStyle={{ fill: '#f3eaff' }}
        labelBgStyle={{ fill: '#302345' }}
        labelBgPadding={[8, 5]}
        interactionWidth={24}
      />
    </g>
  );
}
