# NAFAS Monitor — Mediterranean Pollution Dashboard Design

**Status:** Validated 2026-04-17. Replaces the tour-based `/simulator` with a worldmonitor-style dashboard at `/monitor`.

**Reference:** [koala73/worldmonitor](https://github.com/koala73/worldmonitor) — layout, chrome, posture/events/brief pattern. NAFAS palette and Mediterranean scope.

---

## Goal

Ship a real-looking situational-awareness dashboard for Gabès pollution, framed within the Mediterranean basin. The user lands in `/monitor` and immediately sees: (a) Gabès is the hottest dot on the Med pollution map, (b) live-ish data (pre-baked TROPOMI + our 42 sensors + curated events), (c) a plausible AI brief + news + posture.

## Non-goals

- Cinematic tour / camera choreography (scrapped — user rejected the "simulation" framing)
- Real-time sensor deployment (still pre-baked; honesty label stays)
- Live RSS ingestion (MVP uses hand-curated `news.json`)

## Scope — M2: Mediterranean basin

Camera default `center: [13, 36] zoom: 5.2 pitch: 0`. Covers Tunisia, Libya, Algeria coast, Sicily, Sardinia, southern Italy, parts of Greece. Gabès is the densest dot cluster. Scope selector lets user narrow to `Tunisie` or `Gabès ville`.

## Routes

- `/` — editorial landing **unchanged** except CTA label flips to `Ouvrir le moniteur →` and `/simulator` references become `/monitor`.
- `/monitor` — new dashboard (below).
- `/simulator` — **deleted**.

## Dashboard layout

```
┌─ TopBar 48px ────────────────────────────────────────────────────────┐
│ NAFAS·MONITOR · LIVE · [scope▼] · [crisis ribbon] · ⛶ 🔍 ↗          │
├─ Left 280px ──┬─ MAP (fills, timeframe pills overlay) ──┬─ Right 340│
│ Golfe Gabès   │  Mapbox dark-v11 + 6 deck.gl layers     │ BRIEF AI  │
│ Stats (3)     │  Legend top-right                        │ POSTURE   │
│ Couches (6)   │  3D/2D toggle (stubbed, v2)              │ ÉVÉNEMENTS│
│ Amina card    │                                          │           │
├───────────────┴──────────────────────────────────────────┴───────────┤
│ BottomRow 280px · NEWS │ CAPTEURS NAFAS │ AI INSIGHTS                │
└──────────────────────────────────────────────────────────────────────┘
```

## Data layers (sidebar toggles)

1. **SO₂ TROPOMI** — Sentinel-5P monthly PNG tiles, Oct 2024 → April 2026, Med bbox. Pre-baked via Earth Engine, 24 files in `/public/data/s5p-med/`. Cross-faded by timeframe pills.
2. **Émetteurs industriels** — ~70 curated GeoJSON dots: phosphate (GCT Gabès, SIAPE Sfax, OCP Morocco), petrochem, coal, cement. Size = CO₂-eq; color = complaint severity.
3. **Capteurs NAFAS** — our existing 42 Ghannouch sensors, visible only past zoom 10.
4. **Incidents** — ~40 historical pollution events (Oct-14 2025 asphyxia, Oct-21 strike, Nawaat spills). Hand-curated GeoJSON with source URLs.
5. **Infrastructures vulnérables** — OSM-extracted schools + hospitals within 2 km of emitters.
6. **Vent dominant** — wind arrow field from Open-Meteo historical mean. Static PNG overlay for today's direction.

Default-on: layers 1, 2, 4. Others off.

## Right panel

- **BRIEF AI** — fake-streamed French 2–3 sentence synthesis of current map state. Regenerates every 90 s. Scripts in `brief-scripts.json`. `Sources ↗` citations. `Demander à ORACLE` button disabled in MVP.
- **POSTURE** — mini-table: Gabès CRIT, Sfax ALERTE, Tunis STABLE, Kerkennah STABLE, Monastir SURV. Rows highlight city on hover.
- **ÉVÉNEMENTS** — reverse-chron scrollable feed from `incidents.geojson`. Click → map flies + tooltip opens.

## Bottom row

- **NEWS** — tabs Nawaat / FTDES / Al Jazeera / Reuters / RTCI. Static hand-curated headlines in `news.json`. First tab includes a muted video-loop placeholder.
- **CAPTEURS NAFAS** — 2×4 grid of highest-value sensors with animated sparklines + trend arrows. Click → flyTo.
- **AI INSIGHTS** — longer fake-streamed convergence analysis + 24h forecast sparkline.

## Amina

Not deleted. Moves from narrator to **data point**: a "Profil spotlight" card at the bottom of the left sidebar. Tap → modal with her full story. She's a citizen exposed to the plume, quantified.

## Top bar

Brand mark · version/author · LIVE indicator · scope selector · crisis ribbon (shows most severe open event, pulses red) · fullscreen · search (⌘K stubbed) · back-to-landing.

## Timeframe pills

`1H · 6H · 24H · 48H · 7J · 30J · 1A · Tout`. Default 48H. Drives TROPOMI frame and event filter.

## File plan

**Delete:** all tour code (`Tour`, `DeployButton`, `SkipButton`, `SubtitleStrip`, `SandboxDock`, `AminaCard`, `YearCounter`, `AudioControl`, `lib/sim/tour.ts`, `lib/sim/beats.ts`, `public/audio/`, `oracle-script.json`, `oracle-zones.json`, `amina.json`, `app/simulator/`).

**Keep and move to `components/monitor/` + `lib/monitor/`:** `Map.tsx` (height-fix preserved), `DeckOverlay.tsx` (simplified), `MissingTokenBanner.tsx`, `layers.ts` (keep plume/sensors/gct/landmarks), `store.ts` (stripped to dashboard state), `mapStyle.ts`, `tokens.ts`.

**Create:** `app/monitor/{layout,page}.tsx`, `TopBar`, `TimeframePills`, `LeftSidebar` (+ `LayerToggle`, `StatStrip`, `AminaSpotlight`), `RightPanel` (+ `BriefAI`, `Posture`, `EventsFeed`), `BottomRow` (+ `NewsPanel`, `SensorsPanel`, `AiInsightsPanel`), `Legend`, `ScopeSelector`, `EventTooltip`, `AminaModal`, `lib/monitor/layerFactories.ts`, plus data files `emitters.geojson`, `incidents.geojson`, `infra.geojson`, `news.json`, `posture.json`, `brief-scripts.json`, and the `s5p-med/` tile folder.

## Honesty labels (stay in UI)

- Brief AI card: `· réponse scénarisée` small text under the stream
- Sensors panel: `Données simulées · réseau 42 capteurs à déployer`
- News: each item links to its real source; no fake URLs
- Top-right LIVE badge is honest (our sensors replay in real time from `sensors.json`; TROPOMI is latest-available monthly mean)

## Out-of-scope (v1)

3D globe toggle, real RSS ingestion, real Claude API call from Brief AI card, real OpenAQ integration, mobile-first polish, `⌘K` command palette.
