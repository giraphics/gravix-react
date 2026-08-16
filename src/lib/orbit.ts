import {
  SystemStage,
  childrenOf,
  queryLive,
  type GravixWorld,
  type ISystem,
} from '@giraphics/gravix-engine';

export class ParentOrbitSystem implements ISystem {
  readonly name = 'app.parent-orbit';
  readonly stage = SystemStage.Update;
  readonly order = 0;
  enabled = true;

  onRun(world: GravixWorld, deltaSeconds: number): void {
    if (!this.enabled) {
      return;
    }
    const { Transform } = world.components;
    for (const eid of queryLive(world, [Transform])) {
      if (childrenOf(world, eid).length === 0) {
        continue;
      }
      Transform.rotationY[eid] += deltaSeconds * 0.7;
    }
  }
}
