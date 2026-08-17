import {
  SystemStage,
  queryLive,
  type EntityId,
  type GravixWorld,
  type ISystem,
  type PointCloudRecord,
} from '@giraphics/gravix-engine';

/**
 * Independent Lorenz trajectories, one per point.
 *
 * Mirrors the engine demo system. Lives here because this app consumes npm
 * `@giraphics/gravix-engine@0.1.0`, which does not export it yet. The equations
 * are the ibiblio WebGL page's:
 *
 *   x' = a(y − x)
 *   y' = x(r − z) − y
 *   z' = xy − bz
 *
 * Euler at a fixed `dt`, not the frame delta — the attractor is chaotic in dt.
 */

export const LORENZ_A = 3;
export const LORENZ_B = 1;
export const LORENZ_R = 26.5;
export const LORENZ_DT = 0.01;
/** Opaque green; α is RGB intensity so thinning the cloud cannot make it vanish. */
export const LORENZ_BRIGHTNESS = 1;
export const LORENZ_SCALE = 0.4;
export const LORENZ_Z_CENTER = 25;
const SEED_X = 0.1;
const SEED_SPREAD = 0.8;
const COLOR_R = 0.2;
const COLOR_G = 1;
const COLOR_B = 0.35;

export interface LorenzAttractorOptions {
  readonly a?: number;
  readonly b?: number;
  readonly r?: number;
  readonly dt?: number;
  readonly stepsPerFrame?: number;
  readonly brightness?: number;
  readonly scale?: number;
  readonly spread?: number;
  readonly random?: () => number;
}

export class LorenzAttractorSystem implements ISystem {
  readonly name = 'app.lorenz-attractor';
  readonly stage = SystemStage.Update;
  readonly order = 0;

  active = true;
  enabled = true;

  a: number;
  b: number;
  r: number;
  dt: number;
  stepsPerFrame: number;
  brightness: number;

  private readonly scale: number;
  private readonly spread: number;
  private readonly random: () => number;
  private readonly state = new Map<EntityId, Float32Array>();
  private needsReseed = false;
  private colorsDirty = false;

  constructor(options: LorenzAttractorOptions = {}) {
    this.a = options.a ?? LORENZ_A;
    this.b = options.b ?? LORENZ_B;
    this.r = options.r ?? LORENZ_R;
    this.dt = options.dt ?? LORENZ_DT;
    this.stepsPerFrame = options.stepsPerFrame ?? 1;
    this.brightness = options.brightness ?? LORENZ_BRIGHTNESS;
    this.scale = options.scale ?? LORENZ_SCALE;
    this.spread = options.spread ?? SEED_SPREAD;
    this.random = options.random ?? Math.random;
  }

  onExit(): void {
    this.state.clear();
  }

  prime(eid: EntityId, record: PointCloudRecord): void {
    this.state.set(eid, this.seedState(record.capacity));
    writeDisplay(record, this.state.get(eid)!, this.scale);
    paint(record, this.brightness);
    record.dirty = true;
  }

  reset(): void {
    this.needsReseed = true;
  }

  setBrightness(value: number): void {
    this.brightness = value;
    this.colorsDirty = true;
  }

  syncDisplay(eid: EntityId, record: PointCloudRecord): void {
    const state = this.state.get(eid);
    if (state === undefined || state.length !== record.capacity * 3) {
      return;
    }
    writeDisplay(record, state, this.scale);
    record.dirty = true;
  }

  onRun(world: GravixWorld, _deltaSeconds: number): void {
    if (!this.active) {
      return;
    }
    const { PointCloud } = world.components;

    for (const eid of queryLive(world, [PointCloud])) {
      const record = PointCloud.get(eid);
      if (record === undefined) {
        continue;
      }

      let state = this.state.get(eid);
      if (state === undefined || state.length !== record.capacity * 3) {
        state = this.seedState(record.capacity);
        this.state.set(eid, state);
        writeDisplay(record, state, this.scale);
        paint(record, this.brightness);
        record.dirty = true;
      }

      if (this.needsReseed) {
        this.seedInto(state);
        writeDisplay(record, state, this.scale);
        record.dirty = true;
      }

      if (this.colorsDirty) {
        paint(record, this.brightness);
        record.revision += 1;
      }

      if (!this.enabled) {
        continue;
      }

      const steps = Math.max(1, Math.floor(this.stepsPerFrame));
      for (let step = 0; step < steps; step++) {
        integrate(state, record.count, record.capacity, this.a, this.b, this.r, this.dt);
      }
      writeDisplay(record, state, this.scale);
      record.dirty = true;
    }

    this.needsReseed = false;
    this.colorsDirty = false;
  }

  private seedState(capacity: number): Float32Array {
    const state = new Float32Array(capacity * 3);
    this.seedInto(state);
    return state;
  }

  private seedInto(state: Float32Array): void {
    const spread = this.spread;
    const random = this.random;
    for (let i = 0; i < state.length; i += 3) {
      state[i] = SEED_X + (random() * 2 - 1) * spread;
      state[i + 1] = (random() * 2 - 1) * spread;
      state[i + 2] = (random() * 2 - 1) * spread;
    }
  }
}

function integrate(
  state: Float32Array,
  count: number,
  capacity: number,
  a: number,
  b: number,
  r: number,
  dt: number,
): void {
  if (!Number.isFinite(dt) || dt <= 0) {
    return;
  }
  const live = Math.min(Math.max(0, count), capacity) * 3;
  for (let i = 0; i < live; i += 3) {
    const x = state[i] ?? 0;
    const y = state[i + 1] ?? 0;
    const z = state[i + 2] ?? 0;
    state[i] = x + a * (y - x) * dt;
    state[i + 1] = y + (x * (r - z) - y) * dt;
    state[i + 2] = z + (x * y - b * z) * dt;
  }
}

function writeDisplay(record: PointCloudRecord, state: Float32Array, scale: number): void {
  const { positions, count, capacity } = record;
  const live = Math.min(Math.max(0, Math.floor(count)), capacity);
  for (let i = 0; i < live; i++) {
    const s = i * 3;
    positions[s] = (state[s] ?? 0) * scale;
    positions[s + 1] = ((state[s + 2] ?? 0) - LORENZ_Z_CENTER) * scale;
    positions[s + 2] = (state[s + 1] ?? 0) * scale;
  }
}

function paint(record: PointCloudRecord, brightness: number): void {
  const intensity = clamp01(brightness);
  const { colors } = record;
  for (let i = 0; i < colors.length; i += 4) {
    colors[i] = COLOR_R * intensity;
    colors[i + 1] = COLOR_G * intensity;
    colors[i + 2] = COLOR_B * intensity;
    colors[i + 3] = 1;
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}
