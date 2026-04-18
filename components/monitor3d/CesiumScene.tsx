"use client";

import "@/lib/cesium-env";

import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import { GABES } from "@/lib/tokens";
import type { Sensor } from "@/lib/monitor/layers";
import { onViewer } from "@/lib/cesium-bus";

/**
 * Cesium scene populates the viewer with:
 *   • a real volumetric ParticleSystem rising from GCT
 *   • 42 sensor entities (point primitives) with severity color
 *   • an extruded GCT industrial footprint
 *   • (optional) Google Photorealistic 3D Tiles draped over the terrain
 *     if they're available for Gabès — falls back silently otherwise.
 *
 * Attaches to the already-mounted viewer via a module-level pending
 * callback set by CesiumMap. This sidesteps React refs across dynamic
 * islands.
 */
export function CesiumScene() {
  const [viewer, setViewer] = useState<Cesium.Viewer | null>(null);
  const particlesRef = useRef<Cesium.ParticleSystem | null>(null);

  // Subscribe to the shared viewer bus — CesiumMap publishes once ready
  useEffect(() => onViewer(setViewer), []);

  useEffect(() => {
    if (!viewer) return;
    let disposed = false;
    const abortGoogleTiles = new AbortController();

    // ── 1. Try Google Photorealistic 3D Tiles over Gabès ────────────
    // Requires a Cesium Ion account asset or a Google Maps API key. If neither
    // is configured, we just skip silently and use plain terrain.
    (async () => {
      try {
        // Cesium Ion asset 2275207 = Google Photorealistic 3D Tiles (global)
        const tileset = await Cesium.createGooglePhotorealistic3DTileset();
        if (disposed) return;
        viewer.scene.primitives.add(tileset);
      } catch (err) {
        // Expected if no Ion token configured — fall through to plain terrain
        console.info("[CesiumScene] Google 3D Tiles unavailable, using terrain only:", err);
      }
    })();

    // ── 2. GCT industrial footprint (extruded polygon) ──────────────
    const gctEntity = viewer.entities.add({
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

    // Chimney stacks — 4 thin tall cylinders
    const stackOffsets: [number, number][] = [
      [-0.003, -0.002],
      [-0.001,  0.001],
      [ 0.0015, -0.0015],
      [ 0.0035,  0.0025],
    ];
    const stackEntities = stackOffsets.map((off, i) =>
      viewer.entities.add({
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

    // ── 3. Volumetric plume — real Cesium ParticleSystem ────────────
    // Particles spawn at the GCT centroid, emit upward in a cone, drift with
    // wind, and fade from warm-white core to amber to transparent.
    const emitterModelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
      Cesium.Cartesian3.fromDegrees(GABES.gct[0], GABES.gct[1], 80),
    );

    // Compose a small SVG sprite as the particle texture — soft amber radial
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
      // tilt the emitter so particles drift downwind (south-east baseline)
      emitterModelMatrix: Cesium.Matrix4.fromRotation(
        Cesium.Matrix3.fromRotationX(Cesium.Math.toRadians(-22)),
      ),
      updateCallback: (p, dt) => {
        // gentle horizontal drift — south-east at ~3 m/s
        p.velocity.x += 3.0 * dt;
        p.velocity.y -= 1.8 * dt;
        p.velocity.z += 1.4 * dt; // slight upward buoyancy
      },
    });
    viewer.scene.primitives.add(particleSystem);
    particlesRef.current = particleSystem;

    // ── 4. Sensor entities ──────────────────────────────────────────
    const sensorEntities: Cesium.Entity[] = [];
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
          sensorEntities.push(
            viewer.entities.add({
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
            }),
          );
        }
      })
      .catch((err) => console.warn("[CesiumScene] sensors load failed:", err));

    return () => {
      disposed = true;
      abortGoogleTiles.abort();
      try {
        if (particlesRef.current) {
          viewer.scene.primitives.remove(particlesRef.current);
        }
        viewer.entities.remove(gctEntity);
        stackEntities.forEach((e) => viewer.entities.remove(e));
        sensorEntities.forEach((e) => viewer.entities.remove(e));
      } catch {
        /* viewer already disposed */
      }
    };
  }, [viewer]);

  return null;
}
