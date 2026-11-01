import { useCallback, useEffect, useMemo } from 'react';
import { useNodesState } from '@xyflow/react';
import { projectGraph } from './map-model';

/** Preserve dragged positions while applying fresh projected data; expose explicit layout reset. */
export function useMapNodes({ graph, live, diagnostics, mode, busy, follow, open, inspect }) {
  const mapped = useMemo(
    () => projectGraph(graph, live, diagnostics, mode),
    [graph, live, diagnostics, mode],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const decorate = useCallback(
    (node) => ({ ...node, data: { ...node.data, busy, follow, open, inspect } }),
    [busy, follow, open, inspect],
  );
  useEffect(() => {
    setNodes((previous) => {
      const positions = new Map(previous.map((node) => [node.id, node.position]));
      return mapped.nodes.map((node) =>
        decorate({ ...node, position: positions.get(node.id) || node.position }),
      );
    });
  }, [mapped, decorate, setNodes]);
  return {
    nodes,
    edges: mapped.edges,
    onNodesChange,
    arrange: () => setNodes(mapped.nodes.map(decorate)),
  };
}
