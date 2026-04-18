"use client";

import "@/lib/cesium-env";

import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import { GABES } from "@/lib/tokens";
import type { Sensor } from "@/lib/monitor/layers";
import { onViewer } from "@/lib/cesium-bus";
import { useMonitor } from "@/lib/monitor/store";

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
  const tilesetRef = useRef<Cesium.Cesium3DTileset | null>(null);

  const activeLayers = useMonitor((s) => s.activeLayers);
  const setSelectedEvent = useMonitor((s) => s.setSelectedEvent);

  // Subscribe to the shared viewer bus — CesiumMap publishes once ready
  useEffect(() => onViewer(setViewer), []);

  // Build scene once the viewer arrives
  useEffect(() => {
    if (!viewer) return;
    let disposed = false;

    // ── 1. Try Google Photorealistic 3D Tiles over Gabès ────────────
    (async () => {
      try {
        const tileset = await Cesium.createGooglePhotorealistic3DTileset();
        if (disposed) return;
        viewer.scene.primitives.add(tileset);
        tilesetRef.current = tileset;
      } catch (err) {
        console.info("[CesiumScene] Google 3D Tiles unavailable:", err);
      }
    })();

    // ── 2. GCT industrial footprint (extruded polygon) ──────────────
    const gctEntity = viewer.entities.add({
      id: "gct-footprint",
      name: "GCT Ghannouch",
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArray([
          GABES.gct[0] - 0.008, GABES.gct[1] - 0.006,
          GABES.gct[0] + 0.008, GABES.gct[1] - 0.006,
          GABES.gct[0] + 0.008, GABES.gct[1] + 0.006,
          GABES.gct[0] - 0.008, GABES.gct[1] + 0.006,
        ]),
        height: 0,
        extrudedHeight: 45,
        material: Cesium.Color.fromCssColorString("#2A2520").withAlpha(0.9),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString("#8A7C5A"),
      },
    });

    const stackOffsets: [number, number][] = [
      [-0.003, -0.002],
      [-0.001,  0.001],
      [ 0.0015, -0.0015],
      [ 0.0035,  0.0025],
    ];
    const stackEntities = stackOffsets.map((off, i) =>
      viewer.entities.add({
        id: `gct-stack-${i}`,
        name: `GCT stack ${i + 1}`,
        position: Cesium.Cartesian3.fromDegrees(
          GABES.gct[0] + off[0],
          GABES.gct[1] + off[1],
          0,
        ),
        cylinder: {
          length: 110,
          topRadius: 6,
          bottomRadius: 9,
          material: Cesium.Color.fromCssColorString("#4A4438"),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString("#7A7260"),
        },
      }),
    );
    gctEntitiesRef.current = [gctEntity, ...stackEntities];

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
      minimumParticleLife: 3.2,
      maximumParticleLife: 6.2,
      minimumSpeed: 8.0,
      maximumSpeed: 16.0,
      imageSize: new Cesium.Cartesian2(25, 25),
      emissionRate: 55,
      lifetime: 16.0,
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

    // ── 4. Sensor entities ──────────────────────────────────────────
    fetch("/data/sensors.json")
      .then((r) => r.json())
      .then((data: Sensor[]) => {
        if (disposed) return;
        for (const s of data) {
          const tint =
            s.so2 > 200
              ? Cesium.Color.fromCssColorString("#E24B4A")
              : s.so2 > 100
                ? Cesium.Color.fromCssColorString("#EF9F27")
                : Cesium.Color.fromCssColorString("#3EC9D0");
          sensorEntitiesRef.current.push(
            viewer.entities.add({
              id: `sensor-${s.id}`,
              position: Cesium.Cartesian3.fromDegrees(s.lon, s.lat, 30),
              point: {
                pixelSize: 10 + s.so2 / 30,
                color: tint.withAlpha(0.35),
                outlineColor: tint,
                outlineWidth: 2,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
              },
              description: `SO₂ ${s.so2} µg/m³ · ring ${s.ring}`,
              properties: {
                kind: "sensor",
                sensorId: s.id,
                so2: s.so2,
                ring: s.ring,
              },
            }),
          );
        }
      })
      .catch((err) => console.warn("[CesiumScene] sensors load failed:", err));

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

      if (kind === "sensor") {
        const so2 = entity.properties?.so2?.getValue(Cesium.JulianDate.now());
        const ring = entity.properties?.ring?.getValue(Cesium.JulianDate.now());
        setSelectedEvent({
          id: entity.id,
          lon,
          lat,
          title: `Capteur NAFAS · ring ${ring}`,
          body: `SO₂ ${so2} µg/m³. Télémétrie active, ingestion 10s.`,
          date: new Date().toISOString(),
          severity: so2 > 200 ? "high" : so2 > 100 ? "medium" : "low",
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
        if (tilesetRef.current) {
          viewer.scene.primitives.remove(tilesetRef.current);
          tilesetRef.current = null;
        }
        for (const e of gctEntitiesRef.current) viewer.entities.remove(e);
        for (const e of sensorEntitiesRef.current) viewer.entities.remove(e);
        gctEntitiesRef.current = [];
        sensorEntitiesRef.current = [];
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
