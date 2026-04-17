# NAFAS Simulator — 48h Hackathon Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an immersive, editorial `/simulator` route showing AI-proposed phycoremediation of the Gulf of Gabès, plus a pitch-grade landing page, within a 48-hour hackathon window by a solo dev + Claude Code.

**Architecture:** Two surfaces in one Next.js 15 app. Landing (`/`) is an editorial, scroll-driven pitch anchored on "Amina" and the Oct-14 2025 asphyxiation event. Simulator (`/simulator`) is a full-viewport Mapbox GL + deck.gl world with a 90-second guided tour (3 beats: *Amina intro → ORACLE proposes → healing timelapse*) and a minimal sandbox (year scrubber) after the tour. All "AI" text during the tour is a pre-written French script fake-streamed character-by-character; only the optional medical triage endpoint (`/api/oracle`) hits a real LLM. All data (Sentinel-5P SO₂, sensors, ORACLE zones) ships as static JSON/PNG in `/public/data`. Reaction-diffusion and volumetric shaders are cut — we use opacity-tweened deck.gl layers for the healing timelapse.

**Tech Stack:** Next.js 15 (app router) · TypeScript · Tailwind v4 · shadcn/ui · Mapbox GL JS · deck.gl · GSAP (tour orchestration) · Zustand (sim state) · Tone.js (one ambient stem + ping SFX) · Vercel (auto-deploy from `main`) · Anthropic SDK (triage only) · Lucide icons · Fraunces (display) + Inter (body) + JetBrains Mono (tickers).

**Honesty on TDD:** This is a visual/WebGL/cinematic build. Unit tests are only written for pure functions (beat state machine, scoring/formula utilities). UI, camera, and map tasks are verified by manual smoke-check on the running dev server (see each task's **Verify** step) — explicitly chosen over fake-TDD that would slow the 48h window.

**Scope reference:** See §8 REDUX in the conversation for MUST / SHOULD / CUT. Chunks 1–5 are MUST. Chunk 6 is SHOULD (time-boxed — cut at budget).

---

## Chunk 1: Foundation

### Task 1: Scaffold Next.js 15 + Tailwind + shadcn

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `components/ui/*`, `.gitignore`, `README.md`.

- [ ] **Step 1: Scaffold via create-next-app**

Run (PowerShell via WSL — user is on Windows):
```bash
powershell.exe -Command "cd C:\Users\Lenovo\Desktop\gabes; npx --yes create-next-app@latest . --ts --tailwind --eslint --app --src-dir=false --import-alias='@/*' --use-npm --turbopack --no-git"
```
Accept all defaults. App installs into the current directory.

- [ ] **Step 2: Add shadcn/ui**

```bash
powershell.exe -Command "cd C:\Users\Lenovo\Desktop\gabes; npx --yes shadcn@latest init -y -d"
```
Pick the Neutral base color when prompted (we override with NAFAS tokens in Task 2).

- [ ] **Step 3: Install runtime deps**

```bash
powershell.exe -Command "cd C:\Users\Lenovo\Desktop\gabes; npm i mapbox-gl deck.gl @deck.gl/mapbox @deck.gl/layers @deck.gl/aggregation-layers gsap zustand tone lucide-react @anthropic-ai/sdk; npm i -D @types/mapbox-gl"
```

- [ ] **Step 4: Write `.gitignore` additions**

Append to `.gitignore`:
```
.env*.local
.vercel
/public/data/s5p-raw/
```

- [ ] **Step 5: Verify dev server runs**

```bash
powershell.exe -Command "cd C:\Users\Lenovo\Desktop\gabes; npm run dev"
```
Expected: `Local: http://localhost:3000` and default Next.js landing renders.

- [ ] **Step 6: Commit**

```bash
powershell.exe -Command "cd C:\Users\Lenovo\Desktop\gabes; git add -A; git commit -m 'chore: scaffold next 15 + tailwind + shadcn + deps'"
```

---

### Task 2: Design tokens, fonts, Mapbox env, Vercel deploy

**Files:**
- Modify: `app/globals.css`, `app/layout.tsx`, `tailwind.config.ts`
- Create: `.env.local`, `.env.example`, `lib/tokens.ts`

- [ ] **Step 1: Add NAFAS palette + font imports to `app/globals.css`**

Replace `:root` block with:
```css
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --bg: #0A0F14;
  --bg-2: #111821;
  --bg-3: #1A2330;
  --surface: #F7F6F2;
  --ink: #18180F;
  --ink-2: #4A4A42;
  --ink-3: #9A998F;
  --accent: #1D9E75;
  --accent-2: #3EC99A;
  --danger: #E24B4A;
  --danger-2: #7A1F1F;
  --amber: #EF9F27;
  --amber-2: #854F0B;
  --blue: #378ADD;
  --blue-2: #185FA5;
  --cyan: #3EC9D0;
  --border: rgba(255,255,255,0.08);
  --border-2: rgba(255,255,255,0.14);

  --ease-editorial: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-bloom: cubic-bezier(0.68, -0.55, 0.27, 1.55);

  --font-display: 'Fraunces', Georgia, serif;
  --font-body: 'Inter', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
}

html, body {
  background: var(--bg);
  color: var(--surface);
  font-family: var(--font-body);
}
```

- [ ] **Step 2: Expose tokens in `lib/tokens.ts`**

```ts
export const TOKENS = {
  bg: '#0A0F14',
  bg2: '#111821',
  bg3: '#1A2330',
  surface: '#F7F6F2',
  ink3: '#9A998F',
  accent: '#1D9E75',
  accent2: '#3EC99A',
  danger: '#E24B4A',
  amber: '#EF9F27',
  blue: '#378ADD',
  cyan: '#3EC9D0',
} as const;

export const GABES = {
  center: [10.0982, 33.8815] as [number, number],
  bbox: [9.80, 33.75, 10.35, 34.10] as [number, number, number, number],
  gct: [10.1178, 33.9312] as [number, number],
  schoolChattEssalam: [10.1054, 33.9121] as [number, number],
  aminaHome: [10.1098, 33.9189] as [number, number],
} as const;
```

- [ ] **Step 3: Add env files**

`.env.example`:
```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...
ANTHROPIC_API_KEY=sk-ant-...
```

`.env.local` (user fills in their real token — Mapbox free tier is enough; URL-restrict it in Mapbox dashboard):
```
NEXT_PUBLIC_MAPBOX_TOKEN=__USER_FILLS_IN__
ANTHROPIC_API_KEY=__USER_FILLS_IN_OR_LEAVE_BLANK__
```

- [ ] **Step 4: Deploy placeholder to Vercel**

```bash
powershell.exe -Command "cd C:\Users\Lenovo\Desktop\gabes; npx vercel --yes"
```
Set `NEXT_PUBLIC_MAPBOX_TOKEN` in Vercel dashboard env vars.

- [ ] **Step 5: Verify deploy**

Visit the preview URL. Should see the default Next landing. Commit.

- [ ] **Step 6: Push to GitHub**

```bash
powershell.exe -Command "cd C:\Users\Lenovo\Desktop\gabes; git add -A; git commit -m 'chore: nafas design tokens, fonts, env, first vercel deploy'; git push -u origin main"
```

---

## Chunk 2: Landing page (MUST)

### Task 3: Landing hero + layout

**Files:**
- Modify: `app/page.tsx`, `app/layout.tsx`
- Create: `components/landing/Header.tsx`, `components/landing/Hero.tsx`, `components/landing/LiveBadge.tsx`

- [ ] **Step 1: `app/layout.tsx` metadata + body class**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NAFAS · Gabès — La ville qui respire du phosphate',
  description: 'Plateforme IA de surveillance et remédiation de la pollution industrielle à Gabès, Tunisie.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-[#0A0F14] text-[#F7F6F2] antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: `components/landing/Header.tsx`**

Sticky top nav. Brand mark (square accent swatch + "NAFAS · Gabès" in Inter 500). Links: `Carte`, `Interventions`, `Équipe`, `Dossier`. Right: `<LiveBadge />` + a primary `Ouvrir le simulateur` button linking to `/simulator`. Use Tailwind arbitrary values with the CSS vars (`bg-[color:var(--bg-2)]/80 backdrop-blur-md border-b border-[color:var(--border)]`).

- [ ] **Step 3: `components/landing/LiveBadge.tsx`**

Small pill with a 6px pulsing green dot and "LIVE · Gabès 33.88°N" in Inter 11px. Pulse via `@keyframes` already in globals.

- [ ] **Step 4: `components/landing/Hero.tsx`**

Full-viewport (min-h-[88vh]) hero.
- Top-left tagline pill in red: `● Alerte pollution industrielle · Octobre 2025`.
- H1 in Fraunces clamp(42px,6vw,76px), with `<em class="text-[color:var(--accent-2)]">italic accent on "respire"</em>`: *"La ville qui respire du phosphate. L'outil qui la fait respirer."*
- Sub in Inter 18px, max-w-[720px]: the Amina intro from the dossier (60-word edit).
- 4 stat cards in a grid: `121 enfants hospitalisés`, `340 µg/m³ SO₂ pic`, `800 m école↔GCT`, `0 alertes publiques`. Each card: bg-[color:var(--bg-2)] border-[color:var(--border)] rounded-lg p-5. Big number in Inter 26px (red/amber/surface), label in Inter 11.5px ink-3.
- CTA row: primary `Ouvrir le simulateur →` (bg-accent), secondary `Voir le dossier` (ghost). Primary links to `/simulator`.
- Radial gradient bg overlay (inherit from v0): red radial at 20%/30%, green radial at 80%/70%, 15% / 12% opacity.

- [ ] **Step 5: `app/page.tsx`**

```tsx
import { Header } from '@/components/landing/Header';
import { Hero } from '@/components/landing/Hero';

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
      </main>
    </>
  );
}
```

- [ ] **Step 6: Verify visually**

Open `http://localhost:3000`. Check: header sticks, live badge pulses, H1 uses Fraunces italic on "respire", stat cards grid at 4 cols desktop / 2 cols tablet. Inspect responsive. No hydration warnings in console.

- [ ] **Step 7: Commit**

```bash
git add -A; git commit -m "feat(landing): hero + header with amina anchor and oct-14 stats"
```

---

### Task 4: Landing crisis + platform sections

**Files:**
- Create: `components/landing/Crisis.tsx`, `components/landing/Platform.tsx`, `components/landing/Footer.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: `Crisis.tsx`**

Section with id=`crise`. Left column: h2 in Fraunces 42px *"Le 14 octobre 2025, Gabès n'a pas respiré."* + paragraph in Inter 18px ink-3 describing the event (121 enfants École Chatt Essalam, SO₂ pic 340 µg/m³, aucune infrastructure publique n'a prévu le pic, 800m distance avec GCT). Right column: a simple SVG sparkline of 12 months Sentinel-5P SO₂ (fake data now, replace in Task 9), with Oct-14 marked as a red spike.

- [ ] **Step 2: `Platform.tsx`**

Section id=`plateforme`. H2 in Fraunces: *"Six interventions. Un seul outil."* Grid 3×2 of cards (one per axis: Shahid, Dawa', Mashrabiyya, Hizam Akhdar, Tahallub, Fosfo-Blok). Each card: icon (Lucide emoji-swap until we have custom glyphs), title in Fraunces 20px italic, one-sentence description in Inter 14px. Border, hover lift, slight color wash per axis. Click → scroll-anchor or expand (v1: no interaction, just visual).

- [ ] **Step 3: `Footer.tsx`**

Small footer with: "NAFAS — hackathon 2026, Gabès, Tunisie", GitHub link, "Contact: [team email]", and a disclaimer line in ink-3 11px mono: *"Ceci est un prototype. Données Sentinel-5P publiques + simulations. Aucun conseil médical.*"

- [ ] **Step 4: Include in `app/page.tsx`**

```tsx
<Header />
<main>
  <Hero />
  <Crisis />
  <Platform />
</main>
<Footer />
```

- [ ] **Step 5: Verify** — scroll the page, each section renders, anchors work.

- [ ] **Step 6: Commit** — `feat(landing): crisis anchor + platform grid + footer`.

---

## Chunk 3: Simulator base (MUST)

### Task 5: `/simulator` route with Mapbox custom dark style

**Files:**
- Create: `app/simulator/page.tsx`, `app/simulator/layout.tsx`, `components/simulator/Map.tsx`, `lib/mapStyle.ts`

- [ ] **Step 1: `lib/mapStyle.ts` — NAFAS cool style override**

Since publishing a custom Mapbox Studio style requires a Studio session the user may not want to do, we'll load `mapbox://styles/mapbox/dark-v11` and **patch it at runtime** with `map.setPaintProperty` calls to repaint water, land, labels in NAFAS tokens:

```ts
export const NAFAS_STYLE_URL = 'mapbox://styles/mapbox/dark-v11';

export function repaintNafas(map: mapboxgl.Map) {
  map.setPaintProperty('water', 'fill-color', '#0E2235');
  map.setPaintProperty('land', 'background-color', '#0A0F14');
  map.setPaintProperty('background', 'background-color', '#0A0F14');
  for (const id of ['settlement-major-label', 'settlement-minor-label']) {
    if (map.getLayer(id)) map.setPaintProperty(id, 'text-color', '#9A998F');
  }
}
```
(If a layer ID isn't present in the current Mapbox style version, the guarded `getLayer` skips it silently.)

- [ ] **Step 2: `app/simulator/layout.tsx` — full-viewport, no scroll**

```tsx
export default function SimulatorLayout({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 overflow-hidden bg-[#0A0F14]">{children}</div>;
}
```

- [ ] **Step 3: `components/simulator/Map.tsx` — Mapbox bootstrap**

```tsx
'use client';
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { GABES } from '@/lib/tokens';
import { NAFAS_STYLE_URL, repaintNafas } from '@/lib/mapStyle';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export function Map({ onReady }: { onReady?: (m: mapboxgl.Map) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const map = new mapboxgl.Map({
      container: ref.current,
      style: NAFAS_STYLE_URL,
      center: GABES.center,
      zoom: 11.2,
      pitch: 45,
      bearing: -20,
      antialias: true,
      attributionControl: false,
    });
    map.on('style.load', () => {
      map.setFog({ color: '#0A0F14', 'high-color': '#111821', 'horizon-blend': 0.2 });
      map.addSource('mapbox-dem', { type: 'raster-dem', url: 'mapbox://mapbox.mapbox-terrain-dem-v1', tileSize: 512, maxzoom: 14 });
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.4 });
      repaintNafas(map);
      onReady?.(map);
    });
    return () => map.remove();
  }, []); // eslint-disable-line
  return <div ref={ref} className="absolute inset-0" />;
}
```

- [ ] **Step 4: `app/simulator/page.tsx`**

```tsx
'use client';
import { Map } from '@/components/simulator/Map';
import Link from 'next/link';
import { X } from 'lucide-react';

export default function SimulatorPage() {
  return (
    <>
      <Map />
      <Link href="/" className="absolute top-4 right-4 z-10 rounded-full bg-black/50 backdrop-blur p-2 hover:bg-black/70">
        <X className="w-5 h-5" />
      </Link>
    </>
  );
}
```

- [ ] **Step 5: Verify**

Visit `http://localhost:3000/simulator`. Should see Gulf of Gabès centered, tilted view, custom dark palette. Close (X) returns to `/`. If Mapbox token is missing, expect a console error — add the token to `.env.local` and reload.

- [ ] **Step 6: Commit** — `feat(simulator): mapbox base with nafas repaint + 3d terrain`.

---

### Task 6: GCT marker + 42 sensor dots + plume HeatmapLayer

**Files:**
- Create: `public/data/sensors.json`, `public/data/gct.geojson`, `lib/layers.ts`, `components/simulator/DeckOverlay.tsx`
- Modify: `components/simulator/Map.tsx` (add deck.gl MapboxOverlay)

- [ ] **Step 1: Curate data files**

`public/data/gct.geojson` — a hand-drawn polygon approximating the GCT industrial footprint north of Ghannouch (~10.1178, 33.9312), plus 4 point features for chimneys.

`public/data/sensors.json` — 42 objects each with `{id, lon, lat, so2, no2, aqi}`. Place them in 3 concentric rings around GCT (12 at 500m, 18 at 1500m, 12 at 3km), downwind (south) biased. Values: ring 1 = SO₂ 180–340; ring 2 = 80–180; ring 3 = 20–80. We write these by hand in 10 min; no Pasquill synthesizer.

- [ ] **Step 2: `lib/layers.ts` — deck.gl layer factories**

```ts
import { ScatterplotLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { GeoJsonLayer } from '@deck.gl/layers';

export function sensorsLayer(data: any[], pulse: number) {
  return new ScatterplotLayer({
    id: 'sensors',
    data,
    getPosition: (d: any) => [d.lon, d.lat],
    getRadius: (d: any) => 40 + d.so2 / 4 + Math.sin(pulse + d.id) * 12,
    getFillColor: (d: any) =>
      d.so2 > 200 ? [226, 75, 74, 200] :
      d.so2 > 100 ? [239, 159, 39, 200] :
                     [62, 201, 208, 180],
    radiusUnits: 'meters',
    pickable: true,
    stroked: true,
    lineWidthMinPixels: 1,
    getLineColor: [255, 255, 255, 120],
  });
}

export function plumeLayer(data: any[], intensity: number) {
  return new HeatmapLayer({
    id: 'plume',
    data,
    getPosition: (d: any) => [d.lon, d.lat],
    getWeight: (d: any) => d.so2 * intensity,
    radiusPixels: 90,
    intensity: 1.2,
    threshold: 0.03,
    colorRange: [
      [239, 159, 39, 0],
      [239, 159, 39, 80],
      [226, 75, 74, 140],
      [226, 75, 74, 200],
      [122, 31, 31, 220],
      [122, 31, 31, 240],
    ],
  });
}

export function gctLayer(geojson: any) {
  return new GeoJsonLayer({
    id: 'gct',
    data: geojson,
    extruded: true,
    getElevation: 40,
    getFillColor: [60, 59, 56, 220],
    getLineColor: [150, 150, 150, 255],
    lineWidthMinPixels: 1,
  });
}
```

- [ ] **Step 3: `components/simulator/DeckOverlay.tsx`**

Loads `sensors.json` + `gct.geojson`, uses `@deck.gl/mapbox` `MapboxOverlay` bound to the map ref (passed from `<Map onReady={...}/>`). A `requestAnimationFrame` loop updates a `pulse` counter for the sensor animation and re-calls `overlay.setProps({ layers })`.

```tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Map as MapboxMap } from 'mapbox-gl';
import { sensorsLayer, plumeLayer, gctLayer } from '@/lib/layers';

export function DeckOverlay({ map, plumeIntensity = 1 }: { map: MapboxMap | null; plumeIntensity?: number }) {
  const [sensors, setSensors] = useState<any[]>([]);
  const [gct, setGct] = useState<any>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    Promise.all([
      fetch('/data/sensors.json').then(r => r.json()),
      fetch('/data/gct.geojson').then(r => r.json()),
    ]).then(([s, g]) => { setSensors(s); setGct(g); });
  }, []);

  useEffect(() => {
    if (!map || !sensors.length || !gct) return;
    const overlay = new MapboxOverlay({ layers: [] });
    map.addControl(overlay as any);
    overlayRef.current = overlay;
    let t = 0;
    const tick = () => {
      t += 0.06;
      overlay.setProps({
        layers: [
          gctLayer(gct),
          plumeLayer(sensors, plumeIntensity),
          sensorsLayer(sensors, t),
        ],
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(rafRef.current);
      map.removeControl(overlay as any);
    };
  }, [map, sensors, gct, plumeIntensity]);

  return null;
}
```

- [ ] **Step 4: Wire into `SimulatorPage`**

```tsx
const [map, setMap] = useState<mapboxgl.Map | null>(null);
// ...
<Map onReady={setMap} />
<DeckOverlay map={map} />
```

- [ ] **Step 5: Verify**

Reload `/simulator`. Expect: plume heatmap centered on GCT, spreading downwind; 42 dots with pulsing radius, colored by SO₂ value; GCT extruded block visible on tilt.

- [ ] **Step 6: Commit** — `feat(simulator): deck.gl overlay with gct + 42 sensors + plume heatmap`.

---

## Chunk 4: Beats engine (MUST)

### Task 7: Sim store + beat definitions

**Files:**
- Create: `lib/sim/store.ts`, `lib/sim/beats.ts`, `public/data/oracle-zones.json`, `public/data/oracle-script.json`, `public/data/amina.json`

- [ ] **Step 1: `lib/sim/store.ts` — Zustand**

```ts
import { create } from 'zustand';

export type Scenario = 'continuation' | 'oracle' | 'custom';
export type BeatId = 'b1' | 'b2' | 'b3' | 'b4' | 'sandbox';

interface SimState {
  beat: BeatId;
  beatT: number;       // 0..1 within current beat
  year: number;        // 2026..2050
  scenario: Scenario;
  plumeIntensity: number;
  algaeProgress: number;   // 0..1 (Beat 4)
  tourPaused: boolean;
  setBeat: (b: BeatId) => void;
  setBeatT: (t: number) => void;
  setYear: (y: number) => void;
  setScenario: (s: Scenario) => void;
  setPlume: (p: number) => void;
  setAlgae: (a: number) => void;
  setPaused: (p: boolean) => void;
}

export const useSim = create<SimState>((set) => ({
  beat: 'b1',
  beatT: 0,
  year: 2026,
  scenario: 'oracle',
  plumeIntensity: 1,
  algaeProgress: 0,
  tourPaused: false,
  setBeat: (b) => set({ beat: b }),
  setBeatT: (t) => set({ beatT: t }),
  setYear: (y) => set({ year: y }),
  setScenario: (s) => set({ scenario: s }),
  setPlume: (p) => set({ plumeIntensity: p }),
  setAlgae: (a) => set({ algaeProgress: a }),
  setPaused: (p) => set({ tourPaused: p }),
}));
```

- [ ] **Step 2: `lib/sim/beats.ts` — camera keyframes + durations**

```ts
import type { CameraOptions } from 'mapbox-gl';
import { GABES } from '@/lib/tokens';

export interface BeatDef {
  id: 'b1' | 'b2' | 'b3' | 'b4';
  durationMs: number;
  camera: CameraOptions;
}

export const BEATS: BeatDef[] = [
  { id: 'b1', durationMs: 22000, camera: { center: GABES.aminaHome, zoom: 15.4, pitch: 55, bearing: -10 } },
  { id: 'b2', durationMs: 23000, camera: { center: [(GABES.aminaHome[0]+GABES.gct[0])/2, (GABES.aminaHome[1]+GABES.gct[1])/2], zoom: 13.2, pitch: 50, bearing: -30 } },
  { id: 'b3', durationMs: 20000, camera: { center: GABES.center, zoom: 10.8, pitch: 30, bearing: -20 } },
  { id: 'b4', durationMs: 25000, camera: { center: GABES.center, zoom: 10.2, pitch: 55, bearing: 10 } },
];
```

- [ ] **Step 3: Data — ORACLE zones + script + Amina**

`public/data/oracle-zones.json` — 5 polygons in the Gulf + coastal with `{id, type: 'tahallub'|'hizam'|'mashrabiyya', label, rationale, geometry}`. Hand-draw polygons using [geojson.io](https://geojson.io).

`public/data/oracle-script.json` — 6 paragraphs, FR, ~600 words total. Each paragraph has `{t: secondsFromBeatStart, text}`. Timings land them across Beat 3's 20 seconds.

`public/data/amina.json` — two notification cards:
```json
{
  "warning": { "title": "SO₂ 340 µg/m³", "body": "Évite le trajet nord vers l'école.", "color": "danger" },
  "clean":   { "title": "Air propre", "body": "Trajet libre.", "color": "accent" }
}
```

- [ ] **Step 4: Commit** — `feat(sim): zustand store + beat defs + oracle/amina data`.

---

### Task 8: Tour orchestrator with GSAP

**Files:**
- Create: `lib/sim/tour.ts`, `components/simulator/Tour.tsx`
- Modify: `app/simulator/page.tsx`

- [ ] **Step 1: `lib/sim/tour.ts` — pure-function beat timeline builder**

Builds a GSAP timeline that drives `useSim` store setters + `map.easeTo` for each beat's camera. Exports `buildTour(map, onEnd) => gsap.core.Timeline`. Inside each beat, uses `tl.add(() => { map.easeTo({ ...beat.camera, duration: beat.durationMs }); useSim.getState().setBeat(beat.id); })` at the beat's start offset, and tweens `useSim.getState().setBeatT` from 0→1 over `durationMs`.

For Beat 4 specifically, also tween `setPlume(1→0.2)` and `setAlgae(0→1)` over its duration.

For Beat 3 at t=62s (within Beat 3's 20s window → at 17s of b3), the timeline pauses and waits for `useSim.getState().setPaused(true)` to be toggled off by the Deploy button click.

Add one pure function `beatClamp(t, beatDur)` with a unit test (`lib/sim/tour.test.ts`) verifying 0/half/full mapping — this satisfies the TDD-for-pure-logic rule.

- [ ] **Step 2: `components/simulator/Tour.tsx`**

Client component. On mount, after `map` ready, calls `buildTour(map, onEnd)`. Exposes `Skip tour` / `Deploy ORACLE` buttons gated on beat. Renders the small subtitle strip at bottom reading from `oracle-script.json` indexed by `(beat, beatT)`. Renders Amina notification card at Beat 1 t=0.5 and Beat 4 t=0.9.

- [ ] **Step 3: Wire into simulator page**

```tsx
{map && <DeckOverlay map={map} plumeIntensity={useSim(s => s.plumeIntensity)} />}
{map && <Tour map={map} />}
```

- [ ] **Step 4: Verify**

Reload `/simulator`. Camera should auto-fly through Beat 1 (Amina home), Beat 2 (reveal), pause at Beat 3 for user click on Deploy, then run Beat 4 (plume fades, year counter ticks). Subtitle strip updates per beat.

- [ ] **Step 5: Commit** — `feat(sim): gsap tour timeline + 4-beat camera choreography`.

---

### Task 9: ORACLE zones + healing timelapse

**Files:**
- Create: `components/simulator/OracleZones.tsx`, `components/simulator/HealingLayer.tsx`, `components/simulator/YearCounter.tsx`, `components/simulator/AminaCard.tsx`, `components/simulator/OracleStream.tsx`
- Modify: `components/simulator/DeckOverlay.tsx` (add `zones` + `algae` deck.gl layers conditional on state)

- [ ] **Step 1: `OracleZones.tsx` / GeoJsonLayer**

Extends deck overlay with a GeoJsonLayer reading `oracle-zones.json`. Layer opacity and stroke pulse synced to `beat === 'b3'` using `useSim`. At beat `b3` only, zones appear one-by-one staggered (render only the first `ceil(beatT * 5)` features).

- [ ] **Step 2: `HealingLayer.tsx`**

During beat `b4`, a second GeoJsonLayer renders the same zones filled solid with accent-green at alpha `algaeProgress`. Creates the "green blooms where ORACLE recommended" effect without a shader — visually equivalent at hackathon distance.

Also tweens deck's existing `plumeLayer` intensity prop from 1→0.2 during b4.

- [ ] **Step 3: `YearCounter.tsx`**

Top-left mono ticker. Reads `useSim(s=>s.year)`. During Beat 4, year tweens 2026→2035. Renders big Fraunces display number + small "Gabès" label.

- [ ] **Step 4: `AminaCard.tsx`**

Floating card at Amina's house projected screen-coordinates (use `map.project`). Shows warning during b1, hides during b2/b3, shows "clean" card during b4 end. Enter/exit with scale+fade via inline CSS transition using the editorial ease.

- [ ] **Step 5: `OracleStream.tsx`**

Right-side glass panel, visible only during beat `b3`. Fake-streams `oracle-script.json` text using the `useFakeStream(text, charsPerSec=35)` hook. Panel: bg-[color:var(--bg-2)]/80 backdrop-blur, border, rounded-xl, Inter 15px, max-w-[380px] right-6 top-[10%] bottom-[20%], scrolls as text grows.

- [ ] **Step 6: `Deploy ORACLE` button**

Center-bottom, visible only when `beat === 'b3' && tourPaused === true`. Primary accent. On click: `useSim.getState().setPaused(false)`. Subtle pulse animation.

- [ ] **Step 7: Verify full tour end-to-end**

Reload `/simulator`. Run the tour without skipping. Expect:
- Beat 1: camera low over Ghannouch, Amina's warning card visible, subtitle reads her line.
- Beat 2: camera pulls back, plume ignites (already active but now foregrounded), subtitle updates.
- Beat 3: camera in orbital view, 5 ORACLE zones light up sequentially, OracleStream panel fake-streams, Deploy button appears.
- Click Deploy → Beat 4: plume fades to 20%, algae zones bloom green, year counter ticks 2026→2035, clean notification replaces warning at Amina's.

- [ ] **Step 8: Commit** — `feat(sim): oracle zones + healing layer + year counter + amina card + stream`.

---

## Chunk 5: Polish (MUST)

### Task 10: Audio + copy pass + HUD polish

**Files:**
- Create: `public/audio/ambient.mp3`, `public/audio/ping.mp3`, `components/simulator/Audio.tsx`, `components/simulator/SubtitleStrip.tsx`
- Modify: Hero.tsx copy, `app/page.tsx`

- [ ] **Step 1: Download two royalty-free audio clips**

User task: grab a 30s loopable ambient drone from [freesound.org](https://freesound.org) (CC0 filter, search "ambient drone loop") and a short UI ping (search "soft notification"). Save as `public/audio/ambient.mp3` and `public/audio/ping.mp3`.

- [ ] **Step 2: `Audio.tsx` with Tone.js**

```tsx
'use client';
import { useEffect, useState } from 'react';
import * as Tone from 'tone';
import { Volume2, VolumeX } from 'lucide-react';
import { useSim } from '@/lib/sim/store';

export function Audio() {
  const [muted, setMuted] = useState(true);
  useEffect(() => {
    if (muted) return;
    const player = new Tone.Player({ url: '/audio/ambient.mp3', loop: true, volume: -12, autostart: false }).toDestination();
    Tone.loaded().then(() => player.start());
    return () => { player.stop(); player.dispose(); };
  }, [muted]);

  useEffect(() => {
    const unsub = useSim.subscribe((s) => {
      if (s.beat === 'b4' && s.beatT > 0.9) new Tone.Player('/audio/ping.mp3').toDestination().autostart = true;
    });
    return unsub;
  }, []);

  return (
    <button onClick={() => { setMuted(m => !m); Tone.start(); }}
      className="absolute top-4 right-16 z-10 rounded-full bg-black/50 backdrop-blur p-2 hover:bg-black/70">
      {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
    </button>
  );
}
```

- [ ] **Step 3: Subtitle strip finalization**

Polish `SubtitleStrip.tsx`: bottom-center, max-w-[720px], Fraunces 300 italic 22px, text-surface, drop-shadow, 0.4s fade between beats. Always shows current paragraph of `oracle-script.json` indexed by `(beat, beatT)`.

- [ ] **Step 4: Copy pass**

Proofread and polish all French copy across landing and simulator. Ensure Arabic-ready punctuation (« » guillemets) where citing Amina. User to paste any copy edits here.

- [ ] **Step 5: Verify visual QA**

Click through whole experience: landing → Ouvrir le simulateur → tour plays → closes back to landing. Check on a phone too (chrome devtools mobile emulator, iPhone 14 Pro).

- [ ] **Step 6: Production deploy**

```bash
powershell.exe -Command "cd C:\Users\Lenovo\Desktop\gabes; npx vercel --prod --yes"
```

- [ ] **Step 7: Commit + push** — `feat: audio + copy polish + prod deploy`.

---

## Chunk 6: SHOULD ship (time-boxed)

> **Rule:** Start at most ONE of these on Sunday 07:00. Cut hard at Sunday 09:00 regardless of progress.

### Task 11 (optional): B3 scenario split

**Files:** `components/simulator/ScenarioToggle.tsx`, `components/simulator/SplitView.tsx`

Segmented control top-center: `Continuation | ORACLE | Custom`. Choosing a second scenario splits the viewport vertically with a draggable divider. Technical shortcut: render two `<Map>` instances side by side, one with `plumeIntensity` frozen at 1, the other recomputed from `scenario`.

### Task 12 (optional): Planter click-to-place

Crosshair cursor when Plant mode is active. On map click, spawn a user-defined intervention marker (client state). Validate click position against `bathymetry.geojson` (we add one polygon approximation). Render as an additional GeoJson feature.

### Task 13 (optional): Medical triage modal

New route `/triage` + `/api/oracle` edge route streaming Claude (with Groq fallback). Form: age, zone, 3 symptoms. Auto-inject current SO₂. System prompt restricts to triage + forces the disclaimer. Response cached in `localStorage` keyed by input hash.

### Task 14 (optional): OBS demo video recording

Not code — 3 clean takes via OBS, final cut in DaVinci Resolve, export 1080p30 + 9:16 vertical for social.

---

## Appendix A — Known hazards (pre-empt before they bite)

- **Mapbox token missing** → blank map. Symptom: console `Error: An API access token is required`. Fix: `.env.local` + restart dev server.
- **Webpack cache corruption (Windows)** → weird TS errors after a `git checkout`. Fix: `powershell.exe -Command "rmdir /s /q .next"`, restart dev.
- **Next 16 dynamic route `params`** → must be `await`ed. Not applicable to our current routes but worth flagging for future nested dynamic pages.
- **deck.gl + Mapbox version drift** → deck.gl 9.x pairs with mapbox-gl 3.x. Check `npm ls` if layers don't render.
- **Browser autoplay policy** → audio must be gated behind a user click. Already handled via `muted` default + button.
- **Vercel env vars** — `NEXT_PUBLIC_MAPBOX_TOKEN` must be set for both Production AND Preview scopes.
- **Tour camera flicker** — if `map.easeTo` is re-called during an existing ease, expect a stutter. Guard with a `cameraAnimating` ref in the tour timeline.

## Appendix B — Demo-day checklist

- [ ] Production URL cached as a PWA on demo laptop (works offline if conference Wi-Fi dies).
- [ ] Audio tested on the venue's sound system at 50% volume.
- [ ] `Rejouer l'histoire` (Replay tour) button wired and tested.
- [ ] 30-second demo script memorized: *"Gabès, 14 octobre 2025, 08h47. 121 enfants hospitalisés. Voici ce que NAFAS aurait permis."*
- [ ] Mobile fallback: if laptop fails, phone can run the demo (test on iOS Safari at least once).
- [ ] Fosfo-Blok physical prop on the table (drywall + beige pigment, Saturday evening).
