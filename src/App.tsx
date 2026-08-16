import { HierarchyPanel } from './panels/HierarchyPanel';
import { PointCloudPanel } from './panels/PointCloudPanel';
import { TerrainPanel } from './panels/TerrainPanel';

export function App() {
  return (
    <>
      <header>
        <h1>gravix-react</h1>
        <span className="hint">
          Three worlds, one npm package. Terrain, a streaming point cloud, and a parent/child
          hierarchy. <code>?backend=webgl</code> forces WebGL2; <code>?failDevice=1</code> exercises
          the fallback; <code>?points=N</code> sets cloud capacity.
        </span>
      </header>
      <main>
        <TerrainPanel />
        <PointCloudPanel />
        <HierarchyPanel />
      </main>
    </>
  );
}
