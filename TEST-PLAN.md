# Test plan — bringing `gravix-react` up to the Quasar demo

## Where this app actually stands

| | |
|---|---|
| Engine version | **0.1.0** — three releases behind (`0.4.0` is current) |
| Test setup | **none** — no runner, no config, no cases |
| Map features | **none** — the app is point cloud, Lorenz attractor and terrain panels |
| Rendering | `useGravixEngine` + Babylon, `StrictMode` on |

So "update the React application" is two jobs, and the test list splits along that seam:
**Part A** is the framework-specific work that has no Quasar equivalent, and **Part B** is
porting map features whose defects are already known, because the Quasar demo hit every one
of them.

The ordering matters. Part A first — a React app that leaks an engine per mount will make
every Part B failure look intermittent.

---

## Why this list is written the way it is

Every defect in the Quasar port shared one property: **nothing threw.**

- The accumulator refuses an oversized block by returning `false` and incrementing
  `overflowCount`. It does not throw. An under-reserved layer loads clean and is simply
  missing most of its features — 358 of 436 buildings, in the real case.
- Geometry with a zeroed normal buffer renders. It just renders black, because
  `dot(N, L) = 0` for every light in the scene.
- A line-strip road renders. It is one pixel wide at every zoom.
- A layer toggle that writes to the wrong entity returns without error.

In each case the app came up, logged nothing, and looked wrong. That is precisely the class
of bug a unit test catches and eyeballing a screenshot does not — and it is worth stating
plainly that the Quasar versions of these were all found by reading buffers in a console,
not by anything automated. **Assert on counts and buffer contents, not on screenshots.**
The headless `NullBackend` exists for this.

---

## Part A — React-specific, no Quasar equivalent

These have no counterpart in the Vue app because the hazards are React's.

### A1. StrictMode double-mount must not leak an engine — **highest priority**

`main.tsx` wraps `<App />` in `StrictMode`, which in React 19 mounts every effect, unmounts
it, and mounts it again in development. `useGravixEngine` already has a `cancelled` flag and
disposes on both paths, so this is currently believed correct — which is exactly why it needs
a test before anyone refactors it.

- Mount and unmount a component twice; assert exactly one live engine at rest.
- Assert `NullBackend` disposal count equals creation count.
- Assert no scene outlives its engine.
- Unmount **while `GravixEngine.create` is still pending**; assert the resolved engine is
  disposed rather than orphaned. This is the case the `cancelled` flag exists for, and it is
  invisible when creation resolves fast enough — which it does on a dev machine and does not
  in CI.

### A2. Options changes must not recreate the engine

`configureRef` and `extraRef` hold the callbacks so an inline arrow prop does not re-fire the
effect. Rebuilding a Babylon device on every parent render is a frame-hitch that reads as
"the app is slow", never as a dependency-array bug.

- Re-render with a new inline `configure` closure; assert engine identity is unchanged.
- Assert the ref's current value is the newest closure, so the app is not calling stale code.

### A3. Ref timing

- Assert the effect no-ops when `canvasRef.current` is null rather than throwing.
- Assert a canvas arriving on a later render still brings the engine up.

### A4. Panel state does not drive the render loop

- Toggling a panel control must mutate the component record and set `dirty`, not rebuild the
  layer.
- Assert no allocation inside the frame callback.

---

## Part B — ported map features, with the defect each test pins

Every row here is a bug that actually shipped in the Quasar port. The Vue tests exist at
`gravix-demo/test/gpkg-loader.test.ts` (16 cases) and
`gravix-engine/test/geometry-builders.test.ts`; port the assertions, not the file.

### B1. Capacity — the silent-overflow family

| Test | Pins |
|---|---|
| `vertsPerPosition` is 5 for extruded, 2 for ribboned, 1 otherwise | The 358-buildings bug |
| Emit a real building layer at surveyed capacity; `overflowCount === 0` | Same, end to end |
| Emit a real road layer at surveyed capacity; `overflowCount === 0` | Ribbons doubling vertex count |
| Marker layer holds two pins; `overflowCount === 0` | Pins silently absent |

Assert `overflowCount === 0` **and** `vertexCount > 0`. A layer that emitted nothing also has
zero overflows.

### B2. Lighting and normals

| Test | Pins |
|---|---|
| Extruded walls have non-zero normals; count of zero-length normals is 0 | Buildings black: normals allocated, never written |
| Some wall normals lie in the ground plane | Roof emitted but walls missing |
| A scene with geometry has at least one light | Buildings black: no sun at all |
| `sunDirectionFromSpherical` returns *toward* the sun; the light travels the other way | Sign error lighting everything from below |
| Buildings `lit: true`; overlay and roads `lit: false` while `triangulated: true` | Overlay black — `lit` is not a synonym for `triangulated` |

### B3. Roads as ribbons

| Test | Pins |
|---|---|
| motorway > primary > residential > footway half-widths | Line-strip roads, no hierarchy |
| Unknown highway class gets a width > 0 | `addRibbon` returns false at width 0 — road vanishes |
| A straight east-west road's two sides sit a full width apart | Ribbon built but collapsed |
| Two triangles per segment | Silently still a line strip |
| Miter joint: consecutive quads share corner vertices exactly | Wedge gap at every corner, and a road network is nearly all corners |
| A hairpin does not spike — miter capped at 4× | One spike across the whole map |

### B4. Route markers

| Test | Pins |
|---|---|
| A pin at node index **0** renders | Gate written `if (node)` instead of `!== null`; node 0 is an ordinary junction |
| Pin normals are unit length across disc, stem and head | Sphere shading flat, reading as a disc on a stick |
| Start and goal produce two draw groups | One pin overwriting the other |
| Clearing the route empties the marker layer | Stale pins after a re-pick |
| First click places the start pin before the second click | No feedback on click one |

**If the React app ports raw OSM ids rather than array indices, add:** a pin renders for a
*negative* node id. The reference truncates OSM ids to `int`, wrapping roughly half of them
negative — `-2102975679` is a legitimate node — and its `>= 0` guard silently dropped those
markers. Same lesson as node 0 from the other direction: gate on state, never on a value with
a legal zero or a legal negative.

### B5. Layer visibility

| Test | Pins |
|---|---|
| Toggling a layer flips the entity that actually holds its geometry | The reported toggle bug: writes went to fixture entities while gpkg geometry lived elsewhere |
| Visibility survives a map reload | Toggles silently reset on load |
| App-owned layers (sky, path, markers, crowd) toggle independently of loaded ones | One set clobbering the other |

### B6. Draw-call batching

| Test | Pins |
|---|---|
| N features in 2 colours produce exactly 2 draw groups | A draw call per feature — 1,359 for roads alone |
| Palette bucketing keeps agent draw calls flat as agent count rises | Same rule: group by shader state, not by object |

### B7. Loader seam

The Vue app made `surveyTable` and `emitTable` take an `Iterable` of features instead of a
GeoPackage handle. That one change is what lets all of B1–B6 run without a wasm SQLite build.
**Port the seam before porting the tests** — otherwise every case above needs a fixture file
and a wasm binary, and they will be skipped in CI.

---

## Suggested order

1. **A1** — leak-free mount. Everything else is unreliable until this holds.
2. **B7** — the iterable seam.
3. **B1** — capacity. Cheapest tests, caught the worst bug.
4. **B2** — lighting and normals.
5. **B3, B4** — the two features being ported.
6. **A2–A4, B5, B6** — regressions in behaviour that already works.

## Prerequisite

Bump `@giraphics/gravix-engine` from `0.1.0` to `^0.4.0`. Three releases of API have landed:
the backend seam and `NullBackend` (0.2.0), lighting (0.3.0), and `addPin` (0.4.0). A1 needs
`NullBackend`; B2 needs the light API; B4 needs `addPin`.
