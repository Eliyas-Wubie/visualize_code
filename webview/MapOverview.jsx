import React from 'react';
import { Controls, ControlButton, MiniMap, useViewport } from '@xyflow/react';
import { Sensitivity } from './Sensitivity';
import { Icon } from './Icon';

/** Render viewport controls and source-health-colored minimap navigation. */
export function MapOverview({ instance, navigation, arrange }) {
  const viewport = useViewport();
  const zoom = (direction) =>
    instance?.zoomTo(
      Math.min(
        2,
        Math.max(0.05, instance.getZoom() * Math.pow(1.2, direction * navigation.zoomSpeed)),
      ),
    );
  const center = (x, y) => instance?.setCenter(x, y, { zoom: instance.getZoom(), duration: 200 });
  return (
    <>
      <Controls showInteractive={false} showZoom={false} showFitView={false}>
        <ControlButton title="Zoom out" aria-label="Zoom out" onClick={() => zoom(-1)}>
          <Icon name="minus" />
        </ControlButton>
        <span className="zoom-value" aria-label="Zoom level">
          {Math.round(viewport.zoom * 100)}%
        </span>
        <ControlButton title="Zoom in" aria-label="Zoom in" onClick={() => zoom(1)}>
          <Icon name="plus" />
        </ControlButton>
        <ControlButton
          title="Fit map"
          aria-label="Fit map"
          onClick={() => instance?.fitView({ padding: 0.2, duration: 250, maxZoom: 1 })}
        >
          <Icon name="fit" />
        </ControlButton>
        <ControlButton title="Auto arrange" aria-label="Auto arrange" onClick={arrange}>
          <Icon name="layout" />
        </ControlButton>
        <details className="navigation-settings nodrag nowheel">
          <summary aria-label="Navigation settings" title="Navigation settings">
            <Icon name="settings" />
          </summary>
          <div className="navigation-popover">
            <strong>Navigation</strong>
            <Sensitivity navigation={navigation} />
            <p>Scroll to zoom. Drag empty space to pan.</p>
          </div>
        </details>
      </Controls>
      <MiniMap
        pannable
        zoomable
        zoomStep={10 * navigation.zoomSpeed}
        ariaLabel="Navigation minimap: click to jump, drag to pan, scroll to zoom"
        onClick={(_, position) => center(position.x, position.y)}
        onNodeClick={(_, node) => {
          const absolute =
            instance?.getInternalNode(node.id)?.internals.positionAbsolute || node.position;
          center(
            absolute.x + (node.measured?.width || 270) / 2,
            absolute.y + (node.measured?.height || 150) / 2,
          );
        }}
        nodeColor={(node) =>
          node.data.severity === 'error'
            ? '#ff7373'
            : node.data.severity === 'warning'
              ? '#ffca7a'
              : node.data.root
                ? '#63dbba'
                : '#637ca6'
        }
      />
    </>
  );
}
