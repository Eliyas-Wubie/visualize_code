import React from 'react';
import { ReactFlow, Background } from '@xyflow/react';
import { FunctionNode } from './FunctionNode';
import { ClassNode } from './ClassNode';
import { CallEdge } from './CallEdge';
import { NodeDetails } from './NodeDetails';
import { MapOverview } from './MapOverview';

const nodeTypes = { function: FunctionNode, class: ClassNode };
const edgeTypes = { call: CallEdge };

/** Render the interactive canvas and selected-node panel; never mutate graph relationships. */
export function MapCanvas({ view, instance, setInstance, navigation, selected, inspect, live }) {
  const detail = view.nodes.find((node) => node.data.hostId === selected);
  return (
    <main ref={navigation.canvas} {...navigation.pointerHandlers} aria-label="Function call map">
      <ReactFlow
        nodes={view.nodes}
        edges={view.edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={view.onNodesChange}
        onInit={setInstance}
        onNodeClick={(_, node) => inspect(node.data.hostId)}
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
        defaultEdgeOptions={{ style: { stroke: '#849ac2', strokeWidth: 1.6 } }}
      >
        <Background gap={24} size={1} color="#30394a" />
        <MapOverview instance={instance} navigation={navigation} />
      </ReactFlow>
      {detail && <NodeDetails data={detail.data} live={live} close={() => inspect(undefined)} />}
    </main>
  );
}
