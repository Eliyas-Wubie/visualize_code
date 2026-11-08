import React, { useMemo, useState } from 'react';
import { ReactFlow, Background } from '@xyflow/react';
import { FunctionNode } from './FunctionNode';
import { ClassNode } from './ClassNode';
import { FileNode, FolderNode } from './FileNode';
import { ArchitectureNode } from './ArchitectureNode';
import { CallEdge } from './CallEdge';
import { NodeDetails } from './NodeDetails';
import { MapOverview } from './MapOverview';
import { withHover } from './hoverGraph';
import { returnRoutes } from './return-routes';

const nodeTypes = {
  function: FunctionNode,
  class: ClassNode,
  file: FileNode,
  folder: FolderNode,
  architecture: ArchitectureNode,
};
const edgeTypes = { call: CallEdge };

/** Render the interactive canvas and selected-node panel; never mutate graph relationships. */
export function MapCanvas({ view, instance, setInstance, navigation, selected, inspect, live }) {
  const [hover, setHover] = useState();
  const highlighted = useMemo(
    () => withHover(view.nodes, returnRoutes(view.nodes, view.edges), hover),
    [view.nodes, view.edges, hover],
  );
  const detail = selected != null && view.nodes.find((node) => node.data.hostId === selected);
  return (
    <main
      ref={navigation.canvas}
      {...navigation.pointerHandlers}
      onPointerLeave={() => setHover(undefined)}
      aria-label="Function call map"
    >
      <ReactFlow
        style={{ background: 'var(--ui-bg)' }}
        nodes={highlighted.nodes}
        edges={highlighted.edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={view.onNodesChange}
        onInit={setInstance}
        onNodeClick={(_, node) => inspect(node.data.hostId)}
        onNodeDoubleClick={(event, node) => {
          if (
            !['function', 'class', 'file'].includes(node.type) ||
            !node.data.edit ||
            node.data.busy
          )
            return;
          event.preventDefault();
          event.stopPropagation();
          node.data.edit(node.data.editId || node.data.hostId);
        }}
        onNodeMouseEnter={(_, node) => setHover({ kind: 'node', id: node.id })}
        onNodeMouseLeave={() => setHover(undefined)}
        onEdgeMouseEnter={(_, edge) => setHover({ kind: 'edge', id: edge.id, source: edge.source })}
        onEdgeMouseLeave={() => setHover(undefined)}
        fitView
        minZoom={0.05}
        maxZoom={2}
        nodesConnectable={false}
        edgesReconnectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnDoubleClick={false}
        deleteKeyCode={null}
        colorMode="dark"
        defaultEdgeOptions={{ style: { stroke: 'var(--ui-edge)', strokeWidth: 1.5 } }}
      >
        <Background gap={24} size={1} color="var(--ui-grid)" />
        <MapOverview instance={instance} navigation={navigation} arrange={view.arrange} />
      </ReactFlow>
      {detail && <NodeDetails data={detail.data} live={live} close={() => inspect(undefined)} />}
    </main>
  );
}
