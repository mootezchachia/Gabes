"use client";

// Must be first — sets window.CESIUM_BASE_URL before Cesium is imported
import "@/lib/cesium-env";

import { useEffect, useRef } from "react";
import "cesium/Build/Cesium/Widgets/widgets.css";
import * as Cesium from "cesium";
import { GABES } from "@/lib/tokens";
import { setViewer } from "@/lib/cesium-bus";
import { useIntro } from "@/lib/monitor3d/introStore";
import { startCinematicDrive } from "@/lib/monitor3d/cinematicDrive";

export interface CesiumMapProps {
  onReady?: (viewer: Cesium.Viewer) => void;
}

/**
 * Cesium viewport bootstrap.
 *
 *  - Cesium World Terrain (real DEM, global) — requires Ion auth
 *  - Bing Maps Aerial imagery draped on the terrain (Google Earth-esque base) — requires Ion auth
 *  - NAFAS atmosphere config: dimmed fog, warm horizon, night sky off
 *  - Camera flies to Gabès on mount
 *  - Default widgets (animation, timeline, credit, selection) disabled
 *
 * Cesium ≥1.104 removed the built-in default Ion token, so Ion-backed
 * assets (World Terrain, Bing Aerial) 401 silently without explicit auth,
 * leaving a blank brown globe. We therefore:
 *
 *   - Only use World Terrain + Ion Bing Aerial when NEXT_PUBLIC_CESIUM_ION_TOKEN
 *     is present at build time.
 *   - Otherwise (or if Ion calls fail at runtime), fall back to the no-auth
 *     OpenStreetMap tile server + flat ellipsoid terrain. Lower fidelity but
 *     the deployment never shows an empty globe.
 */
function osmProvider() {
  return new Cesium.OpenStreetMapImageryProvider({
    url: "https://tile.openstreetmap.org/",
  });
}

function installOsmFallback(viewer: Cesium.Viewer) {
  try {
    viewer.imageryLayers.removeAll();
    viewer.imageryLayers.addImageryProvider(osmProvider());
  } catch (err) {
    console.warn("[CesiumMap] failed to install OSM fallback:", err);
  }
}

export function CesiumMap({ onReady }: CesiumMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    // Cesium's default Ion token was removed in 1.104 — if no NEXT_PUBLIC_
    // variable was baked at build time, every Ion call 401s. We only run the
    // Ion code path when we actually have a token.
    const token = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
    const hasIon = Boolean(token && token.length > 0);
    if (hasIon) {
      Cesium.Ion.defaultAccessToken = token!;
    }

    const viewer = new Cesium.Viewer(ref.current, {
      // Strip default UI — we wear our own chrome
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      navigationHelpButton: false,
      sceneModePicker: false,
      selectionIndicator: false,
      creditContainer: document.createElement("div"), // hide attribution bar
      // Vertex normals enable lighting but cost bandwidth + vertex shader
      // time — the tactical look survives fine without them at city scale.
      // World terrain requires Ion auth; without a token we fall back to
      // the default flat ellipsoid rather than fire 401s.
      terrain: hasIon
        ? Cesium.Terrain.fromWorldTerrain({
            requestWaterMask: false,
            requestVertexNormals: false,
          })
        : undefined,
      // When we have Ion, let the Viewer's default imagery initialize —
      // we immediately swap it for Ion Bing Aerial below. Without Ion,
      // install OSM synchronously via baseLayer so we never flash void.
      baseLayer: hasIon
        ? undefined
        : new Cesium.ImageryLayer(osmProvider()),
    });

    // With Ion, upgrade imagery to Bing Aerial with Labels (async). On any
    // Ion failure (bad token, domain-restricted token, outage), fall back
    // to OSM so the deployment never shows an empty globe.
    if (hasIon) {
      (async () => {
        try {
          const bing = await Cesium.IonImageryProvider.fromAssetId(3);
          viewer.imageryLayers.removeAll();
          viewer.imageryLayers.addImageryProvider(bing);
        } catch (err) {
          console.warn(
            "[CesiumMap] Ion Bing imagery failed, falling back to OSM:",
            err,
          );
          installOsmFallback(viewer);
        }
      })();
    }

    // ── NAFAS atmosphere tuning ──────────────────────────────────────
    const scene = viewer.scene;
    // Lighting off — without vertex normals (see terrain config) it adds
    // no visible shading at this altitude band but still ticks the globe.
    scene.globe.enableLighting = false;
    scene.globe.showGroundAtmosphere = true;
    scene.globe.atmosphereHueShift = -0.08;
    scene.globe.atmosphereSaturationShift = -0.25;
    scene.globe.atmosphereBrightnessShift = -0.15;
    scene.skyAtmosphere.hueShift = -0.08;
    scene.skyAtmosphere.saturationShift = -0.2;
    scene.skyAtmosphere.brightnessShift = -0.2;
    scene.fog.enabled = true;
    scene.fog.density = 0.00018;
    // Less aggressive LOD → fewer tiles rendered per frame
    scene.globe.maximumScreenSpaceError = 2.5;
    // FXAA is a full-screen pass; the tactical aesthetic hides its absence
    scene.postProcessStages.fxaa.enabled = false;

    scene.backgroundColor = Cesium.Color.fromCssColorString("#0A0F14");

    // ── Camera: cinematic intro or direct snap ───────────────────────
    const introActive = useIntro.getState().active;
    let cancelDrive: (() => void) | null = null;

    if (introActive) {
      // Starfield on for the "from space" beat (faded out in drive at ~0.7)
      scene.skyBox.show = true;
      // Park camera at the far-out start pose so nothing flashes the
      // final Gabès frame before the RAF loop grabs the wheel.
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(
          GABES.center[0] - 4.5,
          GABES.center[1] - 12,
          20_000_000,
        ),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-88),
          roll: 0,
        },
      });
      cancelDrive = startCinematicDrive(viewer);
    } else {
      scene.skyBox.show = false;
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          GABES.center[0] - 0.015,
          GABES.center[1] - 0.055,
          3200,
        ),
        orientation: {
          heading: Cesium.Math.toRadians(18),
          pitch: Cesium.Math.toRadians(-38),
          roll: 0,
        },
        duration: 0,
      });
    }

    viewerRef.current = viewer;
    setViewer(viewer);
    onReady?.(viewer);

    return () => {
      cancelDrive?.();
      setViewer(null);
      try {
        viewer.destroy();
      } catch {
        /* already destroyed */
      }
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={ref} className="absolute inset-0" />;
}
