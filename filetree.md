#File Tree

  Gabes/
  ├── app/
  │   ├── page.tsx                    ← Landing page (/)
  │   ├── layout.tsx                  ← Root layout + metadata
  │   ├── globals.css
  │   ├── monitor/
  │   │   ├── page.tsx                ← 2D dashboard (/monitor)
  │   │   └── layout.tsx
  │   └── monitor3d/
  │       ├── page.tsx                ← 3D tactical view (/monitor3d)
  │       └── layout.tsx
  │
  ├── components/
  │   ├── landing/                    ← Marketing page sections
  │   │   ├── Header.tsx
  │   │   ├── Hero.tsx
  │   │   ├── Crisis.tsx
  │   │   ├── HowItWorks.tsx
  │   │   ├── Platform.tsx
  │   │   ├── Audiences.tsx
  │   │   ├── FinalCTA.tsx
  │   │   ├── Footer.tsx
  │   │   └── LiveBadge.tsx
  │   │
  │   ├── monitor/                    ← 2D dashboard components
  │   │   ├── Map.tsx                 ← Mapbox instance
  │   │   ├── DeckOverlay.tsx         ← deck.gl layers
  │   │   ├── TopBar.tsx
  │   │   ├── TimeStrip.tsx           ← 24h scrubber
  │   │   ├── TimeframePills.tsx
  │   │   ├── LeftSidebar.tsx
  │   │   ├── LayerToggle.tsx
  │   │   ├── Legend.tsx
  │   │   ├── StatStrip.tsx
  │   │   ├── AminaSpotlight.tsx      ← Citizen story card
  │   │   ├── AminaModal.tsx
  │   │   ├── RightPanel.tsx
  │   │   ├── BriefAI.tsx             ← Scripted AI text stream
  │   │   ├── Posture.tsx             ← City health table
  │   │   ├── NewsPanel.tsx
  │   │   ├── EventsFeed.tsx
  │   │   ├── SensorsPanel.tsx        ← 42-sensor grid + sparklines
  │   │   ├── AiInsightsPanel.tsx
  │   │   ├── BottomRow.tsx
  │   │   ├── Atmosphere.tsx          ← Vignette/grain effects
  │   │   ├── ColdOpen.tsx            ← Intro animation
  │   │   ├── InspectCard.tsx
  │   │   ├── AudienceSwitcher.tsx
  │   │   ├── AudienceFraming.tsx
  │   │   ├── ScopeSelector.tsx
  │   │   └── MissingTokenBanner.tsx
  │   │
  │   ├── monitor3d/                  ← 3D tactical HUD components
  │   │   ├── CesiumMap.tsx           ← Globe instance
  │   │   ├── CesiumScene.tsx         ← Scene layers
  │   │   ├── TacticalHeader.tsx
  │   │   ├── TacticalStatus.tsx
  │   │   ├── TacticalLayers.tsx
  │   │   ├── TacticalLegend.tsx
  │   │   ├── TacticalTimeline.tsx
  │   │   ├── TacticalAudienceRail.tsx
  │   │   ├── TacticalAIScan.tsx
  │   │   ├── TacticalAtmosphere.tsx
  │   │   ├── TacticalTools.tsx
  │   │   ├── TacticalInspect.tsx
  │   │   ├── TacticalReticle.tsx
  │   │   ├── TacticalLabels.tsx
  │   │   ├── TacticalKeybinds.tsx
  │   │   ├── MovablePanel.tsx        ← Draggable/resizable HUD panels
  │   │   ├── LayoutControls.tsx      ← Lock/unlock (L key)
  │   │   ├── IntroGate.tsx           ← Progressive HUD reveal
  │   │   └── CinematicBoot.tsx       ← Opening cinematic overlay
  │   │
  │   └── ui/
  │       └── button.tsx              ← Shadcn button
  │
  ├── lib/
  │   ├── monitor/
  │   │   ├── store.ts                ← Zustand: scope, timeframe, layers, audience
  │   │   ├── layers.ts               ← deck.gl layer factories
  │   │   ├── atmosphere.ts
  │   │   └── useFakeStream.ts        ← Fake AI streaming
  │   ├── monitor3d/
  │   │   ├── introStore.ts           ← Zustand: intro progress
  │   │   ├── cinematicDrive.ts       ← 10s Cesium flight choreography
  │   │   ├── panelLayout.ts          ← HUD positioning + localStorage
  │   │   ├── buildAIScan.ts
  │   │   ├── buildGct.ts
  │   │   ├── buildLabels.ts
  │   │   ├── buildSensors.ts
  │   │   ├── useCesiumCamera.ts
  │   │   └── useDragResize.ts
  │   ├── tokens.ts                   ← Design tokens
  │   ├── mapStyle.ts                 ← Mapbox style defs
  │   ├── cesium-env.ts
  │   ├── cesium-bus.ts               ← Cesium event bus
  │   └── utils.ts
  │
  ├── public/
  │   └── data/
  │       ├── sensors.json            ← 42 simulated sensors
  │       ├── incidents.geojson       ← ~40 pollution events
  │       ├── emitters.geojson        ← ~70 industrial sites
  │       ├── districts.geojson
  │       ├── gct.geojson             ← GCT phosphate plant
  │       ├── infra.geojson           ← Schools, hospitals
  │       ├── landmarks.geojson
  │       ├── streets.geojson
  │       ├── poi.geojson
  │       ├── oracle-zones.geojson    ← AI recommendation zones
  │       ├── brief-scripts.json      ← Scripted AI brief templates
  │       ├── news.json
  │       ├── posture.json
  │       └── s5p-med/                ← TROPOMI SO₂ satellite tiles (24 PNGs)
  │
  ├── scripts/
  │   ├── copy-cesium-assets.mjs      ← Post-install Cesium build copy
  │   └── gen-sensors.mjs
  │
  ├── docs/plans/
  │   ├── 2026-04-17-nafas-monitor-design.md
  │   └── 2026-04-17-nafas-simulator.md
  │
  ├── next.config.ts                  ← Next.js + Cesium webpack config
  ├── tsconfig.json
  ├── package.json
  ├── CLAUDE.md / AGENTS.md
  └── README.md

  ---
  Tech Stack

  ┌────────────┬──────────────────────────────────────────────────┐
  │   Layer    │                    Technology                    │
  ├────────────┼──────────────────────────────────────────────────┤
  │ Framework  │ Next.js 16.2.4, React 19, TypeScript 5           │
  ├────────────┼──────────────────────────────────────────────────┤
  │ Styling    │ Tailwind CSS 4                                   │
  ├────────────┼──────────────────────────────────────────────────┤
  │ State      │ Zustand 5                                        │
  ├────────────┼──────────────────────────────────────────────────┤
  │ 2D Maps    │ Mapbox GL 3.22 + deck.gl 9.3                     │
  ├────────────┼──────────────────────────────────────────────────┤
  │ 3D Globe   │ Cesium 1.129 + Resium                            │
  ├────────────┼──────────────────────────────────────────────────┤
  │ Animation  │ GSAP 3.15                                        │
  ├────────────┼──────────────────────────────────────────────────┤
  │ Audio      │ Tone.js 15.1                                     │
  ├────────────┼──────────────────────────────────────────────────┤
  │ UI         │ Shadcn, Lucide icons                             │
  ├────────────┼──────────────────────────────────────────────────┤
  │ AI (ready) │ Anthropic SDK 0.90 (not yet wired to real calls) │
  ├────────────┼──────────────────────────────────────────────────┤
  │ Data       │ Static GeoJSON + JSON + TROPOMI satellite PNGs   │
  └────────────┴──────────────────────────────────────────────────┘