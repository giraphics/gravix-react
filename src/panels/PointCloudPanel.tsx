import { useCallback, useRef, useState } from 'react';
import {
  GravixEngine,
  PointCloudSimulationSystem,
  addPointCloud,
  type PointCloudRecord,
} from '@giraphics/gravix-engine';

import { LorenzAttractorSystem } from '../lib/lorenz-attractor';
import { readLaunchOptions } from '../lib/options';
import { useEngineStats } from '../lib/useEngineStats';
import { useGravixEngine } from '../lib/useGravixEngine';

type DemoMode = 'lorenz' | 'bounce';

export function PointCloudPanel() {
  const bounce = useRef(
    (() => {
      const simulation = new PointCloudSimulationSystem({ halfExtent: 6, maxSpeed: 1.5 });
      simulation.enabled = false;
      return simulation;
    })(),
  );
  const lorenz = useRef(new LorenzAttractorSystem());
  const recordRef = useRef<PointCloudRecord | null>(null);
  const [eid, setEid] = useState<number | null>(null);
  const [visible, setVisible] = useState(true);
  const [demo, setDemo] = useState<DemoMode>('lorenz');
  const [percent, setPercent] = useState(100);
  const [count, setCount] = useState(0);
  const [capacity, setCapacity] = useState(0);
  const [a, setA] = useState(lorenz.current.a);
  const [b, setB] = useState(lorenz.current.b);
  const [r, setR] = useState(lorenz.current.r);
  const [dt, setDt] = useState(lorenz.current.dt);
  const [alpha, setAlpha] = useState(lorenz.current.brightness);

  const onConfigure = useCallback(async (engine: GravixEngine) => {
    engine.createCamera({
      name: 'cloud-camera',
      fov: Math.PI / 4,
      nearPlane: 0.1,
      farPlane: 500,
      position: [14, 8, 18],
      target: [0, 0, 0],
    });
    const { pointCapacity } = readLaunchOptions();
    const entity = engine.world.entities.create('cloud');
    const record = addPointCloud(engine.world, entity, {
      capacity: pointCapacity,
      pointSize: 2,
    });
    bounce.current.enabled = false;
    lorenz.current.prime(entity.eid, record);
    recordRef.current = record;
    setEid(entity.eid);
    setCapacity(record.capacity);
    setCount(record.count);
  }, []);

  const { canvasRef, engine } = useGravixEngine(onConfigure, {
    clearColor: [0, 0, 0, 1],
    sceneName: 'cloud',
    systems: [bounce.current, lorenz.current],
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
    if (!record || eid === null) {
      return;
    }
    record.count = Math.round(record.capacity * (nextPercent / 100));
    setCount(record.count);
    if (demo === 'lorenz') {
      lorenz.current.syncDisplay(eid, record);
    }
  };

  const applyDemo = (next: DemoMode): void => {
    setDemo(next);
    const record = recordRef.current;
    if (!record || eid === null) {
      return;
    }
    const running = lorenz.current.enabled || bounce.current.enabled;
    if (next === 'lorenz') {
      bounce.current.enabled = false;
      lorenz.current.active = true;
      lorenz.current.enabled = running;
      lorenz.current.syncDisplay(eid, record);
      lorenz.current.setBrightness(lorenz.current.brightness);
    } else {
      lorenz.current.active = false;
      lorenz.current.enabled = false;
      bounce.current.enabled = running;
      fillRandomCloud(record, 6);
    }
  };

  const applyAnimate = (checked: boolean): void => {
    if (demo === 'lorenz') {
      lorenz.current.active = true;
      lorenz.current.enabled = checked;
      bounce.current.enabled = false;
    } else {
      lorenz.current.active = false;
      lorenz.current.enabled = false;
      bounce.current.enabled = checked;
    }
  };

  const readNumber = (raw: string, fallback: number): number => {
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
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
          <label htmlFor="cloud-demo">Demo</label>
          <select
            id="cloud-demo"
            value={demo}
            onChange={(event) => applyDemo(event.target.value as DemoMode)}
          >
            <option value="lorenz">Lorenz attractor</option>
            <option value="bounce">Bouncing box</option>
          </select>
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
        {demo === 'lorenz' ? (
          <div className="params">
            <label>
              a
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={a}
                onChange={(event) => {
                  const next = readNumber(event.target.value, a);
                  setA(next);
                  lorenz.current.a = next;
                }}
              />
            </label>
            <label>
              b
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={b}
                onChange={(event) => {
                  const next = readNumber(event.target.value, b);
                  setB(next);
                  lorenz.current.b = next;
                }}
              />
            </label>
            <label>
              r
              <input
                type="number"
                min={0.1}
                step={0.5}
                value={r}
                onChange={(event) => {
                  const next = readNumber(event.target.value, r);
                  setR(next);
                  lorenz.current.r = next;
                }}
              />
            </label>
            <label>
              dt
              <input
                type="number"
                min={0.001}
                max={0.05}
                step={0.001}
                value={dt}
                onChange={(event) => {
                  const next = readNumber(event.target.value, dt);
                  setDt(next);
                  lorenz.current.dt = next;
                }}
              />
            </label>
            <label>
              α
              <input
                type="number"
                min={0.01}
                max={1}
                step={0.01}
                value={alpha}
                onChange={(event) => {
                  const next = readNumber(event.target.value, alpha);
                  setAlpha(next);
                  lorenz.current.setBrightness(next);
                }}
              />
            </label>
            <label>
              Run
              <button type="button" onClick={() => lorenz.current.reset()}>
                Reset
              </button>
            </label>
          </div>
        ) : null}
        <div className="row">
          <label htmlFor="cloud-animate">Animate</label>
          <input
            id="cloud-animate"
            type="checkbox"
            defaultChecked
            onChange={(event) => applyAnimate(event.target.checked)}
          />
        </div>
        <div className="stats">{stats}</div>
      </div>
    </section>
  );
}

function fillRandomCloud(record: PointCloudRecord, halfExtent: number): void {
  const { positions, colors, capacity } = record;
  const extent = halfExtent * 2;
  for (let i = 0; i < capacity; i++) {
    const p = i * 3;
    positions[p] = Math.random() * extent - halfExtent;
    positions[p + 1] = Math.random() * extent - halfExtent;
    positions[p + 2] = Math.random() * extent - halfExtent;
    const c = i * 4;
    colors[c] = Math.random();
    colors[c + 1] = Math.random();
    colors[c + 2] = Math.random();
    colors[c + 3] = 1;
  }
  record.dirty = true;
  record.revision += 1;
}
