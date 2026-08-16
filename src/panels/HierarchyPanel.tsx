import { useCallback, useMemo, useState } from 'react';
import type { GravixEngine } from '@giraphics/gravix-engine';

import { MARKER_TOPOLOGY, buildMarker } from '../lib/geometry';
import { spawnDynamicMesh } from '../lib/mesh';
import { ParentOrbitSystem } from '../lib/orbit';
import { useEngineStats } from '../lib/useEngineStats';
import { useGravixEngine } from '../lib/useGravixEngine';

function spawnPair(engine: GravixEngine): { parentEid: number; childEid: number } {
  const parentGeom = buildMarker(4, [0.3, 0.75, 1, 1]);
  const childGeom = buildMarker(2, [1, 0.55, 0.2, 1]);
  const parent = spawnDynamicMesh(engine, 'parent', parentGeom, MARKER_TOPOLOGY, [0, 0, 0]);
  const child = spawnDynamicMesh(engine, 'child', childGeom, MARKER_TOPOLOGY, [6, 0, 0]);
  child.entity.setParent(parent.entity);
  return { parentEid: parent.entity.eid, childEid: child.entity.eid };
}

export function HierarchyPanel() {
  const orbit = useMemo(() => new ParentOrbitSystem(), []);
  const [parentEid, setParentEid] = useState<number | null>(null);
  const [childEid, setChildEid] = useState<number | null>(null);
  const [parentVisible, setParentVisible] = useState(true);
  const [childVisible, setChildVisible] = useState(true);
  const [cycles, setCycles] = useState(0);

  const onConfigure = useCallback(async (engine: GravixEngine) => {
    engine.createCamera({
      name: 'hierarchy-camera',
      fov: Math.PI / 4,
      nearPlane: 0.1,
      farPlane: 200,
      position: [14, 10, 14],
      target: [0, 0, 0],
    });
    const ids = spawnPair(engine);
    setParentEid(ids.parentEid);
    setChildEid(ids.childEid);
  }, []);

  const { canvasRef, engine } = useGravixEngine(onConfigure, {
    clearColor: [0.06, 0.04, 0.08, 1],
    sceneName: 'hierarchy',
    systems: [orbit],
  });

  const stats = useEngineStats(engine, 6, ` · cycles ${cycles}`);

  const applyParentVisible = (checked: boolean): void => {
    setParentVisible(checked);
    if (engine && parentEid !== null && engine.world.entities.wrap(parentEid).isValid()) {
      engine.world.components.Renderable.visible[parentEid] = checked ? 1 : 0;
    }
  };

  const applyChildVisible = (checked: boolean): void => {
    setChildVisible(checked);
    if (engine && childEid !== null && engine.world.entities.wrap(childEid).isValid()) {
      engine.world.components.Renderable.visible[childEid] = checked ? 1 : 0;
    }
  };

  const recycle = (): void => {
    if (!engine || parentEid === null) {
      return;
    }
    const parent = engine.world.entities.wrap(parentEid);
    if (parent.isValid()) {
      parent.destroy();
    }
    const ids = spawnPair(engine);
    setParentEid(ids.parentEid);
    setChildEid(ids.childEid);
    setCycles((value) => value + 1);
    engine.world.components.Renderable.visible[ids.parentEid] = parentVisible ? 1 : 0;
    engine.world.components.Renderable.visible[ids.childEid] = childVisible ? 1 : 0;
  };

  return (
    <section>
      <canvas ref={canvasRef} />
      <div className="controls">
        <div className="row">
          <label htmlFor="parent-visible">Parent visible</label>
          <input
            id="parent-visible"
            type="checkbox"
            checked={parentVisible}
            onChange={(event) => applyParentVisible(event.target.checked)}
          />
        </div>
        <div className="row">
          <label htmlFor="child-visible">Child visible</label>
          <input
            id="child-visible"
            type="checkbox"
            checked={childVisible}
            onChange={(event) => applyChildVisible(event.target.checked)}
          />
        </div>
        <div className="row">
          <label htmlFor="hierarchy-orbit">Orbit parent</label>
          <input
            id="hierarchy-orbit"
            type="checkbox"
            defaultChecked
            onChange={(event) => {
              orbit.enabled = event.target.checked;
            }}
          />
        </div>
        <div className="row">
          <label>Lifetime</label>
          <button type="button" onClick={recycle}>
            Destroy / recreate
          </button>
        </div>
        <div className="stats">{stats}</div>
      </div>
    </section>
  );
}
