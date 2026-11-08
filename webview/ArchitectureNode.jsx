import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { NodeHeading } from './NodeHeading';

/** Render an inferred responsibility area; details expose the source files and evidence behind its classification. */
export function ArchitectureNode({ data }) {
  return (
    <article
      className={`function-card architecture-card severity-${data.severity || 'none'} ${data.active ? 'live-active' : ''} ${data.current ? 'step-current' : data.active ? 'step-stack' : data.visited ? 'step-visited' : ''}`}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} />
      <NodeHeading data={data} kind="flow" label="Estimated responsibility" />
      <button className="function-name nodrag" onClick={() => data.inspect(data.hostId)}>
        {data.name}
      </button>
      <div className="node-footer">
        {data.files.length} files / {data.methods.length} functions
      </div>
      <ul className="architecture-files">
        {data.files.slice(0, 3).map((file) => (
          <li key={file} title={file}>
            {file}
          </li>
        ))}
      </ul>
      {data.files.length > 3 && (
        <span className="file">+{data.files.length - 3} more files in details</span>
      )}
      {data.severity && (
        <span className="issue-label">{data.severity === 'error' ? 'Error' : 'Warning'}</span>
      )}
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </article>
  );
}

/** Explain suggested architecture and scan limitations without presenting conventions as verified design intent. */
export function ArchitectureSummary({ architecture }) {
  if (!architecture) return null;
  return (
    <section className="architecture-summary" aria-label="Architecture estimate">
      <strong>{architecture.pattern}</strong>
      <p>{architecture.evidence}</p>
      <details>
        <summary>How this estimate works</summary>
        <p>
          Area names come from file/directory conventions. Arrows represent discovered calls and
          renders only, not imports, deployment boundaries, databases, or services outside the
          scanned code. Click an area for its exact evidence. Unrecognized files remain
          Unclassified.
        </p>
        <p>
          This is a partial map of the selected scan. Multiple patterns may coexist; this estimate
          does not certify MVC, Clean Architecture, microservices, or compliance with dependency
          rules.
        </p>
      </details>
    </section>
  );
}
