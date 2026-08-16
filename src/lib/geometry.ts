import {
  GeometryAccumulator,
  PrimitiveTopology,
  estimateIndexCapacity,
} from '@giraphics/gravix-engine';

export function buildTerrain(cells: number, extent: number): GeometryAccumulator {
  const vertexCount = (cells + 1) * (cells + 1);
  const indexCount = cells * cells * 6;
  const accumulator = new GeometryAccumulator({
    vertexCapacity: vertexCount,
    indexCapacity: indexCount,
    label: 'terrain',
  });

  const step = (extent * 2) / cells;
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 4);

  for (let row = 0; row <= cells; row++) {
    for (let col = 0; col <= cells; col++) {
      const index = row * (cells + 1) + col;
      const x = -extent + col * step;
      const z = -extent + row * step;
      const height = Math.sin(x * 0.08) * Math.cos(z * 0.08) * 6;

      positions[index * 3] = x;
      positions[index * 3 + 1] = height;
      positions[index * 3 + 2] = z;

      const t = (height + 6) / 12;
      colors[index * 4] = 0.2 + t * 0.6;
      colors[index * 4 + 1] = 0.45 + t * 0.4;
      colors[index * 4 + 2] = 0.95 - t * 0.35;
      colors[index * 4 + 3] = 1;
    }
  }

  const indices: number[] = [];
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < cells; col++) {
      const topLeft = row * (cells + 1) + col;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + cells + 1;
      const bottomRight = bottomLeft + 1;
      indices.push(topLeft, bottomLeft, topRight, topRight, bottomLeft, bottomRight);
    }
  }

  if (!accumulator.addIndexedGeometry(positions, indices, colors)) {
    throw new Error(
      `terrain does not fit: ${indices.length} indices into a capacity of ${accumulator.indexCapacity}`,
    );
  }
  return accumulator;
}

export function buildRings(rings: number, segments: number, radius: number): GeometryAccumulator {
  const vertexCount = rings * (segments + 1);
  const accumulator = new GeometryAccumulator({
    vertexCapacity: vertexCount,
    indexCapacity: estimateIndexCapacity({
      vertexCount,
      featureCount: rings,
      triangulated: false,
      usesPrimitiveRestart: true,
    }),
    usesPrimitiveRestart: true,
    label: 'rings',
  });

  const ringPositions = new Float32Array((segments + 1) * 3);
  for (let ring = 0; ring < rings; ring++) {
    const r = radius * ((ring + 1) / rings);
    const height = ring * 1.5 - rings * 0.75;

    for (let segment = 0; segment <= segments; segment++) {
      const angle = (segment / segments) * Math.PI * 2;
      ringPositions[segment * 3] = Math.cos(angle) * r;
      ringPositions[segment * 3 + 1] = height;
      ringPositions[segment * 3 + 2] = Math.sin(angle) * r;
    }

    const t = ring / Math.max(1, rings - 1);
    if (!accumulator.addVertices(ringPositions, [1 - t * 0.6, 0.35 + t * 0.5, 0.3 + t * 0.7, 1])) {
      throw new Error(`ring ${ring} does not fit in the accumulator`);
    }
    accumulator.commitFeature();
  }

  return accumulator;
}

export function buildMarker(
  size: number,
  color: readonly [number, number, number, number],
): GeometryAccumulator {
  const accumulator = new GeometryAccumulator({
    vertexCapacity: 3,
    indexCapacity: 3,
    label: 'marker',
  });
  const positions = new Float32Array([0, 0, 0, size, 0, -size * 0.45, size, 0, size * 0.45]);
  if (!accumulator.addIndexedGeometry(positions, [0, 1, 2], color)) {
    throw new Error('marker triangle does not fit in its own accumulator');
  }
  return accumulator;
}

export const TERRAIN_TOPOLOGY = PrimitiveTopology.TriangleList;
export const RINGS_TOPOLOGY = PrimitiveTopology.LineStrip;
export const MARKER_TOPOLOGY = PrimitiveTopology.TriangleList;
