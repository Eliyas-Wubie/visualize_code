import React from 'react';
import { Controls, ControlButton, MiniMap } from '@xyflow/react';

/** Render viewport controls and source-health-colored minimap navigation. */
export function MapOverview({ instance, navigation }) {
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
      <Controls showInteractive={false} showZoom={false}>
        <ControlButton title="Zoom in" onClick={() => zoom(1)}>
          +
        </ControlButton>
        <ControlButton title="Zoom out" onClick={() => zoom(-1)}>
          −
        </ControlButton>
      </Controls>
      <MiniMap
        pannable
        zoomable
        zoomStep={10 * navigation.zoomSpeed}
        ariaLabel="Navigation minimap: click to jump, drag to pan, scroll to zoom"
        onClick={(_, position) => center(position.x, position.y)}
        onNodeClick={(_, node) => center(node.position.x + 135, node.position.y + 75)}
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
