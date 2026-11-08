import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@xyflow/react/dist/style.css';
import './style.css';
import './hover.css';
import './files.css';
import './architecture.css';
import './authoring.css';
import './syntax.css';
import { useGraph } from './useGraph';
import { useMapNodes } from './useMapNodes';
import { useNavigation } from './useNavigation';
import { MapHeader } from './MapHeader';
import { MapToolbar } from './MapToolbar';
import { MapNotices } from './MapNotices';
import { MapCanvas } from './MapCanvas';
import { ArchitectureSummary } from './ArchitectureNode';
import { useAuthoring } from './useAuthoring';
import { AuthoringDialog } from './AuthoringDialog';
import { StepControls } from './StepControls';
import './step.css';

/** Compose provider state, map projections, and presentation without owning source or runtime authority. */
function App() {
  const state = useGraph();
  const { graph, busy, live } = state;
  const [selected, setSelected] = useState();
  const [mode, setMode] = useState('functions');
  const [instance, setInstance] = useState();
  const navigation = useNavigation(instance);
  const authoring = useAuthoring(mode, state.stop);
  const edit = authoring.edit;
  const editable = mode !== 'architecture' && graph.capabilities?.authoring;
  const view = useMapNodes({
    ...state,
    mode,
    inspect: setSelected,
    edit: editable ? edit : undefined,
  });
  const remaining = graph.nodes.filter((node) => !node.loaded).length;
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
        startingPoint={graph.nodes.find((node) => node.id === graph.root)?.name}
        mode={mode}
        setMode={setMode}
        count={view.nodes.filter((node) => node.type !== 'folder').length}
        connections={view.edges.length}
        locked={Boolean(authoring.dialog) || authoring.working}
      />
      <MapToolbar {...state} remaining={remaining} authoring={editable ? authoring : undefined} />
      <MapNotices graph={graph} mode={mode} count={view.nodes.length} refresh={state.refresh} />
      {mode === 'architecture' && <ArchitectureSummary architecture={view.architecture} />}
      <AuthoringDialog key={`authoring-${mode}`} authoring={authoring} mode={mode} />
      <MapCanvas
        key={`canvas-${mode}`}
        view={view}
        instance={instance}
        setInstance={setInstance}
        navigation={navigation}
        selected={selected}
        inspect={setSelected}
        live={live}
      />
      <StepControls live={live} next={state.nextStep} stop={state.stopStep} />
      {state.loading && (
        <section className="map-loading" role="status" aria-live="polite">
          <div>
            <strong>{state.loading.status ? 'Map unavailable' : 'Loading code map…'}</strong>
            <p>{state.loading.message}</p>
            <p>Language support can take a moment to start when a file first opens.</p>
            {state.loading.status ? (
              <button onClick={state.retryLoad}>Retry</button>
            ) : (
              <button onClick={state.cancelLoad}>Cancel</button>
            )}
          </div>
        </section>
      )}
      <footer>
        Scroll to zoom / Drag canvas or Shift+scroll to pan / Click or drag minimap to navigate /
        Click a node for details / Double-click to edit
        <span>
          {mode === 'files'
            ? 'Files grouped by containing folder; links summarize detected calls. '
            : ''}
          {mode === 'oop' ? 'Classes from discovered calls; standalone functions hidden. ' : ''}
          Static calls, not runtime order. Language support determines coverage. Limit:{' '}
          {graph.limit || 300} functions.
        </span>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
