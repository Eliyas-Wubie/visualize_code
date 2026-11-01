import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@xyflow/react/dist/style.css';
import './style.css';
import { useGraph } from './useGraph';
import { useMapNodes } from './useMapNodes';
import { useNavigation } from './useNavigation';
import { MapHeader } from './MapHeader';
import { MapToolbar } from './MapToolbar';
import { MapNotices } from './MapNotices';
import { MapCanvas } from './MapCanvas';

/** Compose provider state, map projections, and presentation without owning source or runtime authority. */
function App() {
  const state = useGraph();
  const { graph, busy, live } = state;
  const [selected, setSelected] = useState();
  const [mode, setMode] = useState('functions');
  const [instance, setInstance] = useState();
  const navigation = useNavigation(instance);
  const view = useMapNodes({ ...state, mode, inspect: setSelected });
  const remaining = graph.nodes.filter((node) => !node.loaded).length;
  const fit = () => instance?.fitView({ padding: 0.2, duration: 250, maxZoom: 1 });
  useEffect(() => {
    if (!instance || busy || remaining || !graph.nodes.length) return;
    // React Flow must measure newly rendered nodes before fitting the completed map.
    const timer = setTimeout(
      () => instance.fitView({ padding: 0.2, duration: 250, maxZoom: 1 }),
      100,
    );
    return () => clearTimeout(timer);
  }, [instance, busy, remaining, graph.nodes.length, mode]);
  return (
    <div className="app">
      <MapHeader
        app={graph.app}
        mode={mode}
        setMode={setMode}
        count={view.nodes.length}
        connections={view.edges.length}
      />
      <MapToolbar
        {...state}
        remaining={remaining}
        fit={fit}
        arrange={view.arrange}
        navigation={navigation}
      />
      <MapNotices graph={graph} mode={mode} count={view.nodes.length} />
      <MapCanvas
        view={view}
        instance={instance}
        setInstance={setInstance}
        navigation={navigation}
        selected={selected}
        inspect={setSelected}
        live={live}
      />
      <footer>
        Scroll to zoom / Drag canvas or Shift+scroll to pan / Click or drag minimap to navigate /
        Click a node for details
        <span>
          {mode === 'oop' ? 'Classes from discovered calls; standalone functions hidden. ' : ''}
          Static calls, not runtime order. Language support determines coverage. Limit:{' '}
          {graph.limit || 300} functions.
        </span>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
