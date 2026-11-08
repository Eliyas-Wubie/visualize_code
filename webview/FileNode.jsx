import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { NodeHeading } from './NodeHeading';
import { Icon } from './Icon';

/** Show one discovered source file and its aggregated health; clicking opens file details. */
export function FileNode({ data }) {
  return (
    <article
      className={`function-card file-card severity-${data.severity || 'none'} ${data.active ? 'live-active' : ''} ${data.current ? 'step-current' : data.active ? 'step-stack' : data.visited ? 'step-visited' : ''}`}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} />
      <NodeHeading data={data} kind="file" label="File" />
      <button className="function-name nodrag" onClick={() => data.inspect(data.hostId)}>
        {data.name}
      </button>
      <div className="file" title={data.file}>
        {data.file}
      </div>
      <div className="node-footer">{data.methods.length} discovered functions</div>
      {data.severity && (
        <span className="issue-label">{data.severity === 'error' ? 'Error' : 'Warning'}</span>
      )}
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </article>
  );
}

/** Render a folder boundary sized by the layout; children are separate React Flow nodes. */
export function FolderNode({ data }) {
  return (
    <div className="folder-label" title={data.name}>
      <Icon name="folder" />
      {data.name} / <span>{data.fileCount} files</span>
    </div>
  );
}
