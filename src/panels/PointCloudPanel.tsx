import { useCallback, useRef, useState } from 'react';
import {
  GravixEngine,
  PointCloudSimulationSystem,
  addPointCloud,
} from '@giraphics/gravix-engine';

import { readLaunchOptions } from '../lib/options';
import { useEngineStats } from '../lib/useEngineStats';
import { useGravixEngine } from '../lib/useGravixEngine';

export function PointCloudPanel() {
  const simulation = useRef(new PointCloudSimulationSystem({ halfExtent: 6, maxSpeed: 1.5 }));
  const recordRef = useRef<{ count: number; capacity: number } | null>(null);
  const [eid, setEid] = useState<number | null>(null);
  const [visible, setVisible] = useState(true);
  const [percent, setPercent] = useState(100);
  const [count, setCount] = useState(0);
  const [capacity, setCapacity] = useState(0);

  const onConfigure = useCallback(async (engine: GravixEngine) => {
    engine.createCamera({
      name: 'cloud-camera',
      fov: Math.PI / 4,
      nearPlane: 0.1,
      farPlane: 500,
      position: [16, 10, 16],
      target: [0, 0, 0],
    });
    const { pointCapacity } = readLaunchOptions();
    const entity = engine.world.entities.create('cloud');
    const record = addPointCloud(engine.world, entity, {
      capacity: pointCapacity,
      pointSize: 1,
      randomFill: 6,
    });
    recordRef.current = record;
    setEid(entity.eid);
    setCapacity(record.capacity);
    setCount(record.count);
  }, []);

  const { canvasRef, engine } = useGravixEngine(onConfigure, {
    clearColor: [0.03, 0.06, 0.07, 1],
    sceneName: 'cloud',
    systems: [simulation.current],
  });

  const stats = useEngineStats(engine, count);

  const applyVisible = (checked: boolean): void => {
    setVisible(checked);
    if (engine && eid !== null) {
      engine.world.components.Renderable.visible[eid] = checked ? 1 : 0;
    }
  };

  const applyCount = (nextPercent: number): void => {
    setPercent(nextPercent);
    const record = recordRef.current;
    if (!record) {
      return;
    }
    record.count = Math.round(record.capacity * (nextPercent / 100));
    setCount(record.count);
  };

  return (
    <section>
      <canvas ref={canvasRef} />
      <div className="controls">
        <div className="row">
          <label htmlFor="cloud-visible">Visible</label>
          <input
            id="cloud-visible"
            type="checkbox"
            checked={visible}
            onChange={(event) => applyVisible(event.target.checked)}
          />
        </div>
        <div className="row">
          <label htmlFor="cloud-count">
            Points {count.toLocaleString()} / {capacity.toLocaleString() || '—'}
          </label>
          <input
            id="cloud-count"
            type="range"
            min={0}
            max={100}
            value={percent}
            onChange={(event) => applyCount(Number(event.target.value))}
          />
        </div>
        <div className="row">
          <label htmlFor="cloud-animate">Animate</label>
          <input
            id="cloud-animate"
            type="checkbox"
            defaultChecked
            onChange={(event) => {
              simulation.current.enabled = event.target.checked;
            }}
          />
        </div>
        <div className="stats">{stats}</div>
      </div>
    </section>
  );
}
