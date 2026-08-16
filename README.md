# gravix-react

React app for map and point-cloud visualisation, built on
[`@giraphics/gravix-engine`](https://www.npmjs.com/package/@giraphics/gravix-engine).

Installs the **published** `0.1.0` package from npm — not a path into the engine
repo. Three independent worlds (terrain, point cloud, parent/child hierarchy)
prove that component storage does not alias across canvases.

GeoPackage loading stays in the engine smoke test (`apps/test-gravix`). This app
is the React consumer of the same engine API.

## Run

```bash
npm install
npm run dev
```

http://localhost:5174

| Query | Effect |
|---|---|
| `?backend=webgl` | Force WebGL2 |
| `?failDevice=1` | Fail WebGPU device creation so the fallback is exercised |
| `?points=N` | Point-cloud capacity (default 300000) |

## License

MIT
