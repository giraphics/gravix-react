import { useCallback, useRef, useState } from 'react';
import type { GravixEngine } from '@giraphics/gravix-engine';

import { TERRAIN_TOPOLOGY, buildTerrain } from '../lib/geometry';
import { spawnDynamicMesh } from '../lib/mesh';
import { useEngineStats } from '../lib/useEngineStats';
import { useGravixEngine } from '../lib/useGravixEngine';

export function TerrainPanel() {
  const meshRef = useRef<{ setDrawCount(count: number): void } | null>(null);
  const [eid, setEid] = useState<number | null>(null);
  const [drawPercent, setDrawPercent] = useState(100);
  const [visible, setVisible] = useState(true);
  const [indexCount, setIndexCount] = useState(0);

  const onConfigure = useCallback(async (engine: GravixEngine) => {
    engine.createCamera({
      name: 'terrain-camera',
      fov: Math.PI / 4,
      nearPlane: 0.5,
      farPlane: 5000,
      position: [120, 72, 120],
      target: [0, 0, 0],
    });
    const geometry = buildTerrain(48, 60);
    const spawned = spawnDynamicMesh(engine, 'terrain-layer', geometry, TERRAIN_TOPOLOGY);
    meshRef.current = spawned.mesh;
    setIndexCount(geometry.indexCount);
    setEid(spawned.entity.eid);
    spawned.mesh.setDrawCount(geometry.indexCount);
  }, []);

  const { canvasRef, engine } = useGravixEngine(onConfigure, {
    clearColor: [0.04, 0.05, 0.09, 1],
    sceneName: 'terrain',
  });

  const stats = useEngineStats(engine, indexCount);

  const applyVisible = (checked: boolean): void => {
    setVisible(checked);
    if (engine && eid !== null) {
      engine.world.components.Renderable.visible[eid] = checked ? 1 : 0;
    }
  };

  const applyDraw = (percent: number): void => {
    setDrawPercent(percent);
    meshRef.current?.setDrawCount(Math.round(indexCount * (percent / 100)));
  };

  return (
    <section>
      <canvas ref={canvasRef} />
      <div className="controls">
        <div className="row">
          <label htmlFor="terrain-visible">Visible</label>
          <input
            id="terrain-visible"
            type="checkbox"
            checked={visible}
            onChange={(event) => applyVisible(event.target.checked)}
          />
        </div>
        <div className="row">
          <label htmlFor="terrain-draw">
            Draw count {Math.round(indexCount * (drawPercent / 100))} / {indexCount || '—'}
          </label>
          <input
            id="terrain-draw"
            type="range"
            min={0}
            max={100}
            value={drawPercent}
            onChange={(event) => applyDraw(Number(event.target.value))}
          />
        </div>
        <div className="stats">{stats}</div>
      </div>
    </section>
  );
}
