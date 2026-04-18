"use client";

// Must be first — sets window.CESIUM_BASE_URL before Cesium is imported
import "@/lib/cesium-env";

import { useEffect, useRef } from "react";
import "cesium/Build/Cesium/Widgets/widgets.css";
import * as Cesium from "cesium";
import { GABES } from "@/lib/tokens";
import { setViewer } from "@/lib/cesium-bus";

export interface CesiumMapProps {
  onReady?: (viewer: Cesium.Viewer) => void;
}

/**
 * Cesium viewport bootstrap.
 *
 *  - Cesium World Terrain (real DEM, free, global)
 *  - Bing Maps Aerial imagery draped on the terrain (Google Earth-esque base)
 *  - NAFAS atmosphere config: dimmed fog, warm horizon, night sky off
 *  - Camera flies to Gabès on mount
 *  - Default widgets (animation, timeline, credit, selection) disabled
 *
 * NOTE on tokens: Cesium's default Ion token works for a bounded free tier
 * which is fine for a hackathon demo. For production, each user should set
 * NEXT_PUBLIC_CESIUM_ION_TOKEN in .env.local. Without a token, Cesium falls
 * back to Bing Maps imagery with its own auth (still renders).
 */
export function CesiumMap({ onReady }: CesiumMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    // Set Ion token if provided via env (falls back to Cesium's built-in default)
    const token = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
    if (token) {
      Cesium.Ion.defaultAccessToken = token;
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
      terrain: Cesium.Terrain.fromWorldTerrain({
        requestWaterMask: false,
        requestVertexNormals: true,
      }),
      // Bing Maps Aerial with Labels (Ion asset 3). Crisp global satellite
      // base — the plain Google Earth feel even when photoreal tiles aren't
      // available for this cell.
      imageryProvider: undefined, // set below after await (Ion is async)
    });

    // Upgrade imagery to Ion Bing Aerial with Labels (async, best-effort).
    (async () => {
      try {
        const bing = await Cesium.IonImageryProvider.fromAssetId(3);
        viewer.imageryLayers.removeAll();
        viewer.imageryLayers.addImageryProvider(bing);
      } catch (err) {
        console.info("[CesiumMap] Ion Bing imagery unavailable:", err);
      }
    })();

    // ── NAFAS atmosphere tuning ──────────────────────────────────────
    const scene = viewer.scene;
    scene.globe.enableLighting = true;
    scene.globe.atmosphereLightIntensity = 7.0;
    scene.globe.showGroundAtmosphere = true;
    scene.globe.atmosphereHueShift = -0.08;
    scene.globe.atmosphereSaturationShift = -0.25;
    scene.globe.atmosphereBrightnessShift = -0.15;
    scene.skyAtmosphere.hueShift = -0.08;
    scene.skyAtmosphere.saturationShift = -0.2;
    scene.skyAtmosphere.brightnessShift = -0.2;
    scene.fog.enabled = true;
    scene.fog.density = 0.00018;

    // Starfield off — editorial dark prefers flat void sky
    scene.skyBox.show = false;
    scene.backgroundColor = Cesium.Color.fromCssColorString("#0A0F14");

    // ── Camera: flyTo Gabès ──────────────────────────────────────────
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

    viewerRef.current = viewer;
    setViewer(viewer);
    onReady?.(viewer);

    return () => {
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
