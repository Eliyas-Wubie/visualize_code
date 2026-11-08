import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { LiveBadge } from './LiveBadge';
import { NodeHeading } from './NodeHeading';

/** Render a class and its discovered methods; names navigate to their source declarations. */
export function ClassNode({ data }) {
  return (
    <article
      className={`function-card class-card ${data.root ? 'entry' : ''} ${data.active ? 'live-active' : ''} ${data.current ? 'step-current' : data.active ? 'step-stack' : data.visited ? 'step-visited' : ''} ${data.live?.calls ? 'live-observed' : ''} ${data.recent ? 'live-recent' : ''} severity-${data.severity || 'none'}`}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} />
      <NodeHeading data={data} kind="class" label="Class" />
      <button
        className="function-name nodrag"
        title={data.qualifiedName}
        onClick={() => data.inspect(data.hostId)}
      >
        {data.name}
      </button>
      {data.severity && (
        <span className="issue-label">{data.severity === 'error' ? 'Error' : 'Warning'}</span>
      )}
      <div className="file" title={data.file}>
        {data.file.split('/').pop().split('\\').pop()}:{data.line}
      </div>
      <LiveBadge data={data} />
      <div className="class-methods nodrag nowheel">
        {data.methods.map((method) => (
          <button
            key={method.id}
            className="method"
            onClick={() => data.open(method.id)}
            title={`Open method at line ${method.line}`}
          >
            {method.name}
            {method.parameters ?? ' (parameters unavailable)'} ·{' '}
            {method.complexity?.notation === 'Unknown' || !method.complexity
              ? 'Big-O: Unknown'
              : `~${method.complexity.notation}`}
          </button>
        ))}
      </div>
      <div className="node-footer">
        {data.methods.length} discovered methods
        {data.omitted > 0 && <span className="warning">{data.omitted} calls omitted</span>}
      </div>
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </article>
  );
}
