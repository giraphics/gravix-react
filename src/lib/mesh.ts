import {
  CullMode,
  PolygonMode,
  type GeometryAccumulator,
  type GravixEngine,
  type PrimitiveTopology,
} from '@giraphics/gravix-engine';

export function spawnDynamicMesh(
  engine: GravixEngine,
  name: string,
  geometry: GeometryAccumulator,
  topology: PrimitiveTopology,
  translation?: readonly [number, number, number],
) {
  const entity = engine.world.entities.create(name);
  const { Transform, Renderable, GpuMesh } = engine.world.components;
  entity.add(Renderable).add(GpuMesh);

  if (translation) {
    entity.add(Transform);
    Transform.translationX[entity.eid] = translation[0];
    Transform.translationY[entity.eid] = translation[1];
    Transform.translationZ[entity.eid] = translation[2];
  }

  const mesh = engine.world.backend.createDynamicMesh({
    scene: engine.scene,
    name,
    positions: geometry.positionStorage(),
    colors: geometry.colorStorage(),
    indices: geometry.indexStorage(),
    vertexCount: geometry.vertexCount,
    indexCount: geometry.indexCount,
    topology,
    polygonMode: PolygonMode.Fill,
    cullMode: CullMode.None,
  });

  GpuMesh.handle[entity.eid] = engine.world.resources.add(mesh, name);
  Renderable.topology[entity.eid] = topology;
  return { entity, mesh };
}
