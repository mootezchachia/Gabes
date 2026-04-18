/**
 * buildAIScan — ORACLE AI scanning visualization over the Gulf of Gabès.
 *
 * Components:
 *   • A 7km radar base ring + 3/5km inner concentric dashed rings, centered
 *     over the bay (~10.135, 33.87), with a slowly rotating 18° amber wedge
 *     (8-sec period) driven by a CallbackProperty. The metaphor: ORACLE is
 *     continuously combing the territory for intervention opportunities.
 *   • 5 candidate intervention polygons loaded from /data/oracle-zones.geojson.
 *     Each pulses a cyan-green fill between 0.18 and 0.35 alpha on a 1.6s cycle,
 *     staggered by phase, with crosshair + multi-line mono label at centroid.
 *   • 5 beam polylines from the GCT plant to each zone centroid — visibility
 *     is gated by a CallbackProperty that fires only while the sweep wedge
 *     crosses the bearing to that zone (±15°). Effect: beams flicker to life
 *     as the sweep passes over them, as if ORACLE is re-confirming each site.
 */

import * as Cesium from "cesium";

const GULF_CENTER: [number, number] = [10.135, 33.87];
const GCT_LON = 10.1178;
const GCT_LAT = 33.9312;
const GCT_ALT = 80;

const SWEEP_RADIUS_M = 7000;
const SWEEP_PERIOD_MS = 8000;
const SWEEP_HALF_WEDGE_RAD = (18 * Math.PI) / 180; // 18° total → ±9° from leading edge; we render a 18° wedge
const BEAM_HALF_WINDOW_RAD = (15 * Math.PI) / 180;

const ZONE_PHASES = [0, 0.8, 1.6, 2.4, 3.2];

const LABEL_FONT_MONO = "500 10.5px 'JetBrains Mono', monospace";
const SCAN_TITLE_FONT = "500 11px 'JetBrains Mono', monospace";
const EARTH_R = 6378137;

interface ZoneProperties {
  id: string;
  type: string;
  score: number;
  rationale: string;
  area_ha: number;
  eta_months: number;
  priority: number;
  centroid: [number, number];
}

interface ZonePolygonGeometry {
  type: "Polygon";
  coordinates: number[][][];
}

interface ZoneFeature {
  type: "Feature";
  properties: ZoneProperties;
  geometry: ZonePolygonGeometry;
}

interface ZoneFeatureCollection {
  type: "FeatureCollection";
  features: ZoneFeature[];
}

/** Sweep angle in radians, clockwise from north, derived from current time. */
function sweepAngle(nowMs: number): number {
  const tFrac = (nowMs % SWEEP_PERIOD_MS) / SWEEP_PERIOD_MS;
  return tFrac * Math.PI * 2;
}

/**
 * Offset a lon/lat by (distanceMeters, bearingRad) where bearing is clockwise
 * from north. Uses a flat-Earth approximation (fine at 7km scale).
 */
function offsetLonLat(
  lon: number,
  lat: number,
  distanceMeters: number,
  bearingRad: number,
): [number, number] {
  const dLat =
    ((distanceMeters * Math.cos(bearingRad)) / EARTH_R) * (180 / Math.PI);
  const dLon =
    ((distanceMeters * Math.sin(bearingRad)) /
      (EARTH_R * Math.cos((lat * Math.PI) / 180))) *
    (180 / Math.PI);
  return [lon + dLon, lat + dLat];
}

/** Bearing in radians (clockwise from north) from (lon1,lat1) → (lon2,lat2). */
function bearingTo(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number,
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  let θ = Math.atan2(y, x);
  if (θ < 0) θ += 2 * Math.PI;
  return θ;
}

/** Smallest absolute difference between two angles (radians), in [0, π]. */
function angleDelta(a: number, b: number): number {
  let d = Math.abs(a - b) % (2 * Math.PI);
  if (d > Math.PI) d = 2 * Math.PI - d;
  return d;
}

export async function buildAIScan(
  viewer: Cesium.Viewer,
): Promise<{
  entities: Cesium.Entity[];
  dispose: () => void;
  setActive: (on: boolean) => void;
}> {
  const entities: Cesium.Entity[] = [];

  const [cLon, cLat] = GULF_CENTER;
  const centerCartesian = Cesium.Cartesian3.fromDegrees(cLon, cLat, 0);

  // ── A. Radar base ring (solid 7km dashed outline, ultra-low alpha fill) ──
  entities.push(
    viewer.entities.add({
      id: "oracle-sweep-base",
      position: centerCartesian,
      ellipse: {
        semiMajorAxis: SWEEP_RADIUS_M,
        semiMinorAxis: SWEEP_RADIUS_M,
        material: Cesium.Color.fromCssColorString("#EF9F27").withAlpha(0.04),
        height: 0,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString("#EF9F27").withAlpha(0.3),
        outlineWidth: 1.5,
      },
    }),
  );

  // Inner concentric rings (3km + 5km) as dashed polylines via polyline entities
  for (const r of [3000, 5000]) {
    const positions: Cesium.Cartesian3[] = [];
    const N = 96;
    for (let i = 0; i <= N; i++) {
      const θ = (i / N) * Math.PI * 2;
      const [lon, lat] = offsetLonLat(cLon, cLat, r, θ);
      positions.push(Cesium.Cartesian3.fromDegrees(lon, lat, 0));
    }
    entities.push(
      viewer.entities.add({
        id: `oracle-sweep-ring-${r}`,
        polyline: {
          positions,
          clampToGround: true,
          width: 1,
          material: new Cesium.PolylineDashMaterialProperty({
            color: Cesium.Color.fromCssColorString("#EF9F27").withAlpha(0.22),
            dashLength: 14,
          }),
        },
      }),
    );
  }

  // ── A2. Sweeping wedge — CallbackProperty polygon hierarchy ──────────────
  const wedgeHierarchy = new Cesium.CallbackProperty(() => {
    const now = Date.now();
    const θ = sweepAngle(now);
    const pts: Cesium.Cartesian3[] = [centerCartesian];
    // 8 subdivisions across the 18° wedge for a slightly curved arc
    const STEPS = 8;
    for (let i = 0; i <= STEPS; i++) {
      const α = θ + (i / STEPS) * SWEEP_HALF_WEDGE_RAD;
      const [lon, lat] = offsetLonLat(cLon, cLat, SWEEP_RADIUS_M, α);
      pts.push(Cesium.Cartesian3.fromDegrees(lon, lat, 0));
    }
    return new Cesium.PolygonHierarchy(pts);
  }, false);

  entities.push(
    viewer.entities.add({
      id: "oracle-sweep-wedge",
      polygon: {
        hierarchy: wedgeHierarchy,
        material: Cesium.Color.fromCssColorString("#EF9F27").withAlpha(0.18),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        height: 0,
        outline: false,
      },
    }),
  );

  // ── D. Persistent ORACLE · SCAN ACTIF label at sweep center ──────────────
  entities.push(
    viewer.entities.add({
      id: "oracle-scan-title",
      position: Cesium.Cartesian3.fromDegrees(cLon, cLat, 600),
      label: {
        text: "ORACLE · SCAN ACTIF",
        font: SCAN_TITLE_FONT,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        fillColor: Cesium.Color.fromCssColorString("#EF9F27"),
        outlineColor: Cesium.Color.fromCssColorString("rgba(10,15,20,0.95)"),
        outlineWidth: 3,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        scaleByDistance: new Cesium.NearFarScalar(2000, 1.15, 80000, 0.55),
        translucencyByDistance: new Cesium.NearFarScalar(
          3000,
          1.0,
          120000,
          0.0,
        ),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        pixelOffset: new Cesium.Cartesian2(0, -8),
      },
    }),
  );

  // ── B/C. Zones, labels, crosshairs, beams ────────────────────────────────
  const res = await fetch("/data/oracle-zones.geojson");
  const fc = (await res.json()) as ZoneFeatureCollection;

  // Cache bearings so we don't recompute every frame
  const bearings = new Map<string, number>();

  fc.features.forEach((feature, i) => {
    const p = feature.properties;
    const ring = feature.geometry.coordinates[0];
    const flat: number[] = [];
    for (const [lon, lat] of ring) flat.push(lon, lat);
    const positions = Cesium.Cartesian3.fromDegreesArray(flat);

    const [ctLon, ctLat] = p.centroid;
    const phase = ZONE_PHASES[i % ZONE_PHASES.length];

    // Fill — pulsing low-alpha cyan-green
    const fillCb = new Cesium.CallbackProperty(() => {
      const t = Date.now() / 1000;
      const a = 0.18 + 0.17 * Math.sin((t + phase) * 1.2);
      return Cesium.Color.fromCssColorString("#3EC99A").withAlpha(a);
    }, false);

    // Zone polygon
    entities.push(
      viewer.entities.add({
        id: `oracle-zone-${p.id}`,
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(positions),
          material: new Cesium.ColorMaterialProperty(fillCb),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          height: 0,
          outline: true,
          outlineColor:
            Cesium.Color.fromCssColorString("#3EC99A").withAlpha(0.85),
          outlineWidth: 2,
        },
      }),
    );

    // Centroid crosshair point
    entities.push(
      viewer.entities.add({
        id: `oracle-zone-crosshair-${p.id}`,
        position: Cesium.Cartesian3.fromDegrees(ctLon, ctLat, 0),
        point: {
          pixelSize: 4,
          color: Cesium.Color.fromCssColorString("#3EC99A"),
          outlineColor: Cesium.Color.fromCssColorString("rgba(10,15,20,0.9)"),
          outlineWidth: 1,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      }),
    );

    // Multi-line label
    const line1 = `${p.id} · ${p.type}`;
    const line2 = `score ${p.score.toFixed(2)} · ${p.area_ha} ha · ${p.eta_months}m`;
    entities.push(
      viewer.entities.add({
        id: `oracle-zone-label-${p.id}`,
        position: Cesium.Cartesian3.fromDegrees(ctLon, ctLat, 0),
        label: {
          text: `${line1}\n${line2}`,
          font: LABEL_FONT_MONO,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          fillColor: Cesium.Color.fromCssColorString("#F7F6F2"),
          outlineColor: Cesium.Color.fromCssColorString("rgba(10,15,20,0.95)"),
          outlineWidth: 3,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -10),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(1500, 1.1, 60000, 0.55),
          translucencyByDistance: new Cesium.NearFarScalar(
            2500,
            1.0,
            90000,
            0.0,
          ),
        },
      }),
    );

    // Beam — visible only while sweep crosses this zone's bearing
    const bearing = bearingTo(cLon, cLat, ctLon, ctLat);
    bearings.set(p.id, bearing);

    const beamPositions = [
      Cesium.Cartesian3.fromDegrees(GCT_LON, GCT_LAT, GCT_ALT),
      Cesium.Cartesian3.fromDegrees(ctLon, ctLat, 0),
    ];

    const showCb = new Cesium.CallbackProperty(() => {
      const θ = sweepAngle(Date.now());
      // Wedge spans [θ, θ + SWEEP_HALF_WEDGE_RAD]; use its center for the match.
      const wedgeCenter = θ + SWEEP_HALF_WEDGE_RAD / 2;
      return angleDelta(wedgeCenter, bearing) < BEAM_HALF_WINDOW_RAD;
    }, false);

    entities.push(
      viewer.entities.add({
        id: `oracle-beam-${p.id}`,
        polyline: {
          positions: beamPositions,
          width: 1.5,
          material: new Cesium.PolylineGlowMaterialProperty({
            color:
              Cesium.Color.fromCssColorString("#3EC9D0").withAlpha(0.65),
            glowPower: 0.25,
          }),
          show: showCb,
        },
      }),
    );
  });

  // ── setActive / dispose ───────────────────────────────────────────────────
  let disposed = false;

  const setActive = (on: boolean) => {
    if (disposed) return;
    for (const e of entities) {
      e.show = on;
    }
  };

  const dispose = () => {
    disposed = true;
    for (const e of entities) {
      try {
        viewer.entities.remove(e);
      } catch {
        /* viewer already destroyed */
      }
    }
    entities.length = 0;
  };

  return { entities, dispose, setActive };
}
