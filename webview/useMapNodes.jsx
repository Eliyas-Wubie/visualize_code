import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useNodesState } from '@xyflow/react';
import { projectGraph } from './map-model';
import { layoutKey, reconcileLayout } from './layout-state';

/** Reflow new topology into branch lanes; metadata/runtime updates preserve user positions and measured sizes. */
export function useMapNodes({ graph, live, diagnostics, mode, busy, follow, open, inspect, edit }) {
  const mapped = useMemo(
    () => projectGraph(graph, live, diagnostics, mode),
    [graph, live, diagnostics, mode],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const topology = layoutKey(mapped, graph.root, mode);
  const previousTopology = useRef();
  const decorate = useCallback(
    (node) => ({ ...node, data: { ...node.data, busy, follow, open, inspect, edit } }),
    [busy, follow, open, inspect, edit],
  );
  useEffect(() => {
    const relayout = previousTopology.current !== topology;
    previousTopology.current = topology;
    setNodes((previous) => reconcileLayout(previous, mapped.nodes, relayout).map(decorate));
  }, [mapped, decorate, setNodes, topology]);
  return {
    nodes,
    edges: mapped.edges,
    architecture: mapped.architecture,
    onNodesChange,
    arrange: () => {
      const dimensions = new Map(nodes.map((node) => [node.data.hostId, node.measured]));
      const arranged = projectGraph(graph, live, diagnostics, mode, dimensions);
      setNodes(reconcileLayout(nodes, arranged.nodes, true).map(decorate));
    },
  };
}
