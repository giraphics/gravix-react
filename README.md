# gravix-react

React app for map and point-cloud visualisation, built on
[`@giraphics/gravix-engine`](https://www.npmjs.com/package/@giraphics/gravix-engine).

**[Live demo](https://giraphics.github.io/gravix-react/)** ·
[Lorenz attractor](https://giraphics.github.io/gravix-react/?points=300000) ·
[WebGL2](https://giraphics.github.io/gravix-react/?backend=webgl)

GitHub’s README cannot run WebGPU, so the demo is that link, not an embedded
canvas. Use a browser with WebGPU (Chrome/Edge). If it is blank, open the
WebGL2 link.

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

## GitHub Pages

Push `main`. The workflow builds the SPA and deploys it. **Once**, in the GitHub
repo: **Settings → Pages → Source: GitHub Actions**. After the first green run
the live demo URL above works.

## License

MIT
