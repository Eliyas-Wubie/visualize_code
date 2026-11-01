import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { LiveBadge } from './LiveBadge';
import { ComplexityBadge } from './ComplexityBadge';

/** Render one function with call handles, source navigation, and discovery status. */
export function FunctionNode({ data }) {
  return (
    <article
      className={`function-card ${data.root ? 'entry' : ''} ${data.active ? 'live-active' : ''} ${data.live?.calls ? 'live-observed' : ''} ${data.recent ? 'live-recent' : ''} severity-${data.severity || 'none'}`}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} />
      <div className="node-kind">{data.root ? 'STARTING FUNCTION' : 'FUNCTION'}</div>
      <button className="function-name nodrag" onClick={() => data.inspect(data.hostId)}>
        {data.displayName}
      </button>
      {data.severity && (
        <span className="issue-label">{data.severity === 'error' ? 'Error' : 'Warning'}</span>
      )}
      {data.className && <div className="class-name">Class: {data.className}</div>}
      <ComplexityBadge complexity={data.complexity} />
      <div className="parameters" title={data.parameters ?? 'Parameters unavailable'}>
        {data.parameters ?? 'Parameters unavailable'}
      </div>
      <div className="file" title={data.file}>
        {data.file.split('/').pop().split('\\').pop()}:{data.line}
      </div>
      <LiveBadge data={data} />
      <div className="node-footer">
        {data.loaded ? (
          'Calls mapped'
        ) : (
          <button
            className="nodrag follow"
            disabled={data.busy}
            onClick={() => data.follow(data.hostId)}
          >
            Follow calls
          </button>
        )}
        {data.omitted > 0 && <span className="warning">{data.omitted} omitted (limit)</span>}
      </div>
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </article>
  );
}
