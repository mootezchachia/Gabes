"use client";

import "@/lib/cesium-env";

import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import { GABES } from "@/lib/tokens";
import { onViewer } from "@/lib/cesium-bus";
import { useMonitor } from "@/lib/monitor/store";
import { buildGct } from "@/lib/monitor3d/buildGct";
import { buildSensors } from "@/lib/monitor3d/buildSensors";

/**
 * Cesium scene populates the viewer with:
 *   • a volumetric ParticleSystem rising from GCT (wind-driven)
 *   • 42 sensor entities (point primitives) with severity color
 *   • an extruded GCT industrial footprint + 4 stacks
 *
 * Layer visibility is driven by the shared monitor store so tactical toggles
 * in the HUD actually hide/show things in real time. An optional Google
 * Photorealistic 3D Tiles layer is added when a Cesium Ion token is set.
 */
export function CesiumScene() {
  const [viewer, setViewer] = useState<Cesium.Viewer | null>(null);
  const particlesRef = useRef<Cesium.ParticleSystem | null>(null);
  const gctEntitiesRef = useRef<Cesium.Entity[]>([]);
  const sensorEntitiesRef = useRef<Cesium.Entity[]>([]);
  const incidentEntitiesRef = useRef<Cesium.Entity[]>([]);
  const infraEntitiesRef = useRef<Cesium.Entity[]>([]);

  const activeLayers = useMonitor((s) => s.activeLayers);
  const setSelectedEvent = useMonitor((s) => s.setSelectedEvent);

  // Subscribe to the shared viewer bus — CesiumMap publishes once ready
  useEffect(() => onViewer(setViewer), []);

  // Build scene once the viewer arrives
  useEffect(() => {
    if (!viewer) return;
    let disposed = false;

    // Google Photorealistic 3D Tiles were removed — Bing aerial already
    // gives the tactical imagery look, and stacking the two caused z-fighting,
    // the "Only the Google geocoder can be used with…" console warning, and
    // doubled the per-frame GPU load for no visual gain at city scale.

    // ── 2. GCT industrial complex (realistic footprint + buildings + chimneys) ──
    // Delegated to buildGct which reads /data/gct.geojson and builds the real
    // polygon + 10 extruded buildings + tanks + phosphogypsum stack + 4 stacks
    // with pulsing active markers, plus a "GCT · GHANNOUCH" site-level label.
    let gctDispose: (() => void) | null = null;
    buildGct(viewer)
      .then((gct) => {
        if (disposed) {
          gct.dispose();
          return;
        }
        gctEntitiesRef.current = gct.entities;
        gctDispose = gct.dispose;
      })
      .catch((err) => console.warn("[CesiumScene] buildGct failed:", err));

    // ── 3. Volumetric plume — real Cesium ParticleSystem ────────────
    const emitterModelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
      Cesium.Cartesian3.fromDegrees(GABES.gct[0], GABES.gct[1], 80),
    );
    const svg = encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>
        <defs>
          <radialGradient id='g'>
            <stop offset='0%' stop-color='rgb(255,210,140)' stop-opacity='1'/>
            <stop offset='55%' stop-color='rgb(239,159,39)' stop-opacity='0.55'/>
            <stop offset='100%' stop-color='rgb(122,40,48)' stop-opacity='0'/>
          </radialGradient>
        </defs>
        <rect width='64' height='64' fill='url(%23g)'/>
      </svg>`,
    );
    const textureUrl = `data:image/svg+xml;utf8,${svg}`;

    const particleSystem = new Cesium.ParticleSystem({
      image: textureUrl,
      startColor: Cesium.Color.fromCssColorString("rgba(255,210,140,0.85)"),
      endColor: Cesium.Color.fromCssColorString("rgba(122,40,48,0.0)"),
      startScale: 1.0,
      endScale: 6.5,
      // Tighter envelope — fewer, shorter-lived particles. Still reads as
      // a dense plume but halves the simulated population vs the old
      // (55 rate × 16s lifetime ≈ 880 live particles) config.
      minimumParticleLife: 2.8,
      maximumParticleLife: 5.4,
      minimumSpeed: 8.0,
      maximumSpeed: 16.0,
      imageSize: new Cesium.Cartesian2(25, 25),
      emissionRate: 28,
      lifetime: 10.0,
      loop: true,
      sizeInMeters: true,
      emitter: new Cesium.ConeEmitter(Cesium.Math.toRadians(28)),
      modelMatrix: emitterModelMatrix,
      emitterModelMatrix: Cesium.Matrix4.fromRotation(
        Cesium.Matrix3.fromRotationX(Cesium.Math.toRadians(-22)),
      ),
      updateCallback: (p, dt) => {
        p.velocity.x += 3.0 * dt;
        p.velocity.y -= 1.8 * dt;
        p.velocity.z += 1.4 * dt;
      },
    });
    viewer.scene.primitives.add(particleSystem);
    particlesRef.current = particleSystem;

    // ── 4. Sensor entities (semantic POI-anchored 42-sensor network) ────
    // Delegated to buildSensors which reads the new sensors.json with real
    // addresses, districts, categories, and installs a point + label + pulsing
    // halo per critical sensor. Labels fade in/out by distance.
    let sensorsDispose: (() => void) | null = null;
    buildSensors(viewer)
      .then((s) => {
        if (disposed) {
          s.dispose();
          return;
        }
        sensorEntitiesRef.current = s.entities;
        sensorsDispose = s.dispose;
      })
      .catch((err) => console.warn("[CesiumScene] buildSensors failed:", err));

    // ── 4b. Incidents (historical events) ────────────────────────────
    interface IncidentProps {
      id: string; date: string; title: string; body: string;
      severity: "high" | "medium" | "low"; source_url?: string;
    }
    interface PointFeature<P> { geometry: { coordinates: [number, number] }; properties: P; }
    fetch("/data/incidents.geojson")
      .then((r) => r.json() as Promise<{ features: PointFeature<IncidentProps>[] }>)
      .then((fc) => {
        if (disposed) return;
        for (const f of fc.features) {
          const [lon, lat] = f.geometry.coordinates;
          const p = f.properties;
          const tint =
            p.severity === "high"
              ? Cesium.Color.fromCssColorString("#E24B4A")
              : p.severity === "medium"
                ? Cesium.Color.fromCssColorString("#EF9F27")
                : Cesium.Color.fromCssColorString("#3EC99A");
          incidentEntitiesRef.current.push(
            viewer.entities.add({
              id: `incident-${p.id}`,
              position: Cesium.Cartesian3.fromDegrees(lon, lat, 20),
              point: {
                pixelSize: 8,
                color: tint.withAlpha(0.5),
                outlineColor: tint,
                outlineWidth: 1.5,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                scaleByDistance: new Cesium.NearFarScalar(1.5e3, 1.6, 4.0e4, 0.5),
              },
              properties: {
                kind: "incident",
                incidentId: p.id,
                title: p.title,
                body: p.body,
                date: p.date,
                severity: p.severity,
                sourceUrl: p.source_url,
              },
            }),
          );
        }
      })
      .catch((err) => console.warn("[CesiumScene] incidents load failed:", err));

    // ── 4c. Infrastructure (schools + hospitals) ─────────────────────
    interface InfraProps { kind: "school" | "hospital"; name: string; city: string; }
    fetch("/data/infra.geojson")
      .then((r) => r.json() as Promise<{ features: PointFeature<InfraProps>[] }>)
      .then((fc) => {
        if (disposed) return;
        for (const f of fc.features) {
          const [lon, lat] = f.geometry.coordinates;
          const p = f.properties;
          // schools cyan, hospitals warm amber
          const tint =
            p.kind === "hospital"
              ? Cesium.Color.fromCssColorString("#EF9F27")
              : Cesium.Color.fromCssColorString("#3EC9D0");
          infraEntitiesRef.current.push(
            viewer.entities.add({
              id: `infra-${p.kind}-${lon.toFixed(4)}-${lat.toFixed(4)}`,
              position: Cesium.Cartesian3.fromDegrees(lon, lat, 10),
              point: {
                pixelSize: 6,
                color: tint.withAlpha(0.3),
                outlineColor: tint.withAlpha(0.85),
                outlineWidth: 1,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                scaleByDistance: new Cesium.NearFarScalar(2.0e3, 1.4, 5.0e4, 0.6),
              },
              properties: {
                kind: "infra",
                infraKind: p.kind,
                name: p.name,
                city: p.city,
              },
            }),
          );
        }
      })
      .catch((err) => console.warn("[CesiumScene] infra load failed:", err));

    // ── 5. Click-to-inspect handler ─────────────────────────────────
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const picked = viewer.scene.pick(click.position);
      if (!picked) {
        setSelectedEvent(null);
        return;
      }
      const entity = picked.id;
      if (!(entity instanceof Cesium.Entity)) return;

      const kind = entity.properties?.kind?.getValue(Cesium.JulianDate.now());
      const carto = entity.position
        ? Cesium.Cartographic.fromCartesian(
            entity.position.getValue(Cesium.JulianDate.now()) ??
              Cesium.Cartesian3.fromDegrees(GABES.gct[0], GABES.gct[1]),
          )
        : null;
      const lon = carto ? (carto.longitude * 180) / Math.PI : GABES.gct[0];
      const lat = carto ? (carto.latitude * 180) / Math.PI : GABES.gct[1];

      const now = Cesium.JulianDate.now();
      if (kind === "sensor") {
        const so2 = entity.properties?.so2?.getValue(now) ?? 0;
        const no2 = entity.properties?.no2?.getValue(now) ?? 0;
        const pm25 = entity.properties?.pm25?.getValue(now);
        const code = entity.properties?.code?.getValue(now);
        const sensorName = entity.properties?.name?.getValue(now);
        const address = entity.properties?.address?.getValue(now);
        const district = entity.properties?.district?.getValue(now);
        const category = entity.properties?.category?.getValue(now);
        const uptime = entity.properties?.uptime_pct?.getValue(now);
        const critical = entity.properties?.critical?.getValue(now);
        setSelectedEvent({
          id: entity.id,
          lon,
          lat,
          title: `${sensorName ?? code ?? "Capteur NAFAS"}${critical ? " · CRITIQUE" : ""}`,
          body: `${address ?? ""}${district ? ` · ${district}` : ""}${category ? ` · ${category}` : ""}\nSO₂ ${so2} µg/m³ · NO₂ ${no2} µg/m³${pm25 ? ` · PM2.5 ${pm25} µg/m³` : ""}${uptime ? ` · uptime ${uptime}%` : ""}`,
          date: new Date().toISOString(),
          severity: critical || so2 > 250 ? "high" : so2 > 100 ? "medium" : "low",
        });
      } else if (kind === "incident") {
        const title = entity.properties?.title?.getValue(now) ?? "Incident";
        const body = entity.properties?.body?.getValue(now) ?? "";
        const date = entity.properties?.date?.getValue(now) ?? new Date().toISOString();
        const severity = entity.properties?.severity?.getValue(now) ?? "high";
        const sourceUrl = entity.properties?.sourceUrl?.getValue(now);
        setSelectedEvent({ id: entity.id, lon, lat, title, body, date, severity, sourceUrl });
      } else if (kind === "infra") {
        const infraKind = entity.properties?.infraKind?.getValue(now);
        const name = entity.properties?.name?.getValue(now) ?? "Infrastructure";
        const city = entity.properties?.city?.getValue(now) ?? "";
        setSelectedEvent({
          id: entity.id,
          lon,
          lat,
          title: `${infraKind === "hospital" ? "Hôpital" : "École"} · ${name}`,
          body: `${city}. Infrastructure sensible indexée par NAFAS. ${
            infraKind === "hospital"
              ? "Tensions pédiatriques corrélées aux pics SO₂."
              : "Évacuations recommandées si panache < 2 km."
          }`,
          date: new Date().toISOString(),
          severity: "low",
        });
      } else if (entity.id === "gct-footprint" || String(entity.id).startsWith("gct-stack")) {
        setSelectedEvent({
          id: "gct",
          lon,
          lat,
          title: "GCT Ghannouch · complexe phosphatier",
          body:
            "Source primaire de SO₂ et aérosols sur le Golfe de Gabès. Émission continue, pic diurne 08h–14h.",
          date: new Date().toISOString(),
          severity: "high",
        });
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      disposed = true;
      try {
        handler.destroy();
        if (particlesRef.current) {
          viewer.scene.primitives.remove(particlesRef.current);
        }
        gctDispose?.();
        sensorsDispose?.();
        for (const e of incidentEntitiesRef.current) viewer.entities.remove(e);
        for (const e of infraEntitiesRef.current) viewer.entities.remove(e);
        gctEntitiesRef.current = [];
        sensorEntitiesRef.current = [];
        incidentEntitiesRef.current = [];
        infraEntitiesRef.current = [];
      } catch {
        /* viewer already disposed */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer]);

  // ── Layer visibility binding ────────────────────────────────────
  useEffect(() => {
    if (!viewer) return;

    // plume
    if (particlesRef.current) {
      particlesRef.current.show = activeLayers.plume;
    }
    // GCT footprint + stacks (emitters)
    for (const e of gctEntitiesRef.current) {
      e.show = activeLayers.emitters;
    }
    // Sensors
    for (const e of sensorEntitiesRef.current) {
      e.show = activeLayers.sensors;
    }
    // Incidents (historical events)
    for (const e of incidentEntitiesRef.current) {
      e.show = activeLayers.incidents;
    }
    // Infrastructure (schools + hospitals)
    for (const e of infraEntitiesRef.current) {
      e.show = activeLayers.infra;
    }
    // Wind — we re-parameterize the particle drift. If wind is off, settle
    // vertically (no horizontal drift).
    if (particlesRef.current) {
      particlesRef.current.updateCallback = activeLayers.wind
        ? (p, dt) => {
            p.velocity.x += 3.0 * dt;
            p.velocity.y -= 1.8 * dt;
            p.velocity.z += 1.4 * dt;
          }
        : (p, dt) => {
            p.velocity.x *= Math.max(0, 1 - dt * 0.8);
            p.velocity.y *= Math.max(0, 1 - dt * 0.8);
            p.velocity.z += 1.2 * dt;
          };
    }

    viewer.scene.requestRender();
  }, [viewer, activeLayers]);

  return null;
}
