# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev        # start dev server (webpack mode — Turbopack disabled, see next.config.mjs)
npm run build      # prebuild runs copy-cesium-assets.mjs first, then next build
npm run lint       # eslint
npm run preview    # build + start in one command
```

No test suite exists yet.

## Architecture

**NAFAS Gabès** — geospatial pollution monitoring platform for Gabès, Tunisia. Three routes:

| Route | Stack |
|---|---|
| `/` | Landing page — pure React/Tailwind, no map |
| `/monitor` | 2D dashboard — Mapbox GL + deck.gl + Zustand |
| `/monitor3d` | 3D tactical globe — Cesium + Resium + Zustand |

### State management

Two Zustand stores, both client-only:

- `lib/monitor/store.ts` — 2D dashboard: `scope` (med/tunisia/gabes), `timeframe`, `activeLayers` (8 flags), `selectedEvent`, `audience`, `aminaModalOpen`, `audioMuted`
- `lib/monitor3d/introStore.ts` — cinematic intro: `stage` (0→1), `active`, localStorage-backed so repeat visitors skip

### 2D monitor data flow

`DeckOverlay.tsx` reads `activeLayers` + `timeframe` from the store and calls `lib/monitor/layers.ts` layer factories → deck.gl `MapboxOverlay`. The plume layer is a `BitmapLayer` cycling through `public/data/s5p-med/*.png` tiles (24 monthly TROPOMI SO₂ PNGs). All GeoJSON data is fetched from `public/data/`.

### 3D monitor boot sequence

`CesiumMap.tsx` → `useCesiumCamera` hook runs `cinematicDrive.ts` (10-second Cesium camera fly-in from space). `introStore.stage` ticks 0→1 over 10 s; `IntroGate.tsx` uses this to stagger HUD panel reveals. `CinematicBoot.tsx` renders the fullscreen overlay with skip button.

### HUD panels (monitor3d)

`MovablePanel.tsx` wraps every tactical panel — draggable, resizable, position persisted in `localStorage` via `lib/monitor3d/panelLayout.ts`. Lock/unlock toggled with `L` key. Panel positions reset with `Shift+R`.

### Cesium + webpack

The SWC native binary is broken on this machine — dev runs with WASM fallback. `next.config.mjs` adds a `NormalModuleReplacementPlugin` to redirect `@zip.js/zip.js/lib/zip-no-worker.js` → `@zip.js/zip.js`, fixing a Cesium KmlDataSource exports-field conflict. Cesium is in `serverExternalPackages` to prevent SSR bundling; its static assets are copied to `public/cesium/` by `scripts/copy-cesium-assets.mjs` at postinstall/prebuild.

### Design tokens

`lib/tokens.ts` holds the canonical color/ease/coordinate constants as JS values. The same values are declared as CSS custom properties in `app/globals.css` under `:root` (prefix `--nafas-*`). Always use CSS vars in Tailwind (`text-[color:var(--nafas-accent)]`), JS constants in Three.js/deck.gl/Cesium layer code.

### 3D (Three.js / R3F)

`components/landing/MashrabiyyaScene.tsx` — the only R3F component. Lazy-loaded via `next/dynamic` with `ssr: false` inside `ArchitectShowcase.tsx` (which must be `"use client"`). Pattern: all R3F canvases must be client components loaded dynamically.

### Simulated data

AI brief (`BriefAI.tsx`) streams from `public/data/brief-scripts.json` via `lib/monitor/useFakeStream.ts` — not a real API call. Sensors are synthetic (`public/data/sensors.json`). Both are labeled as simulated in the UI.
