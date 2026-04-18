/**
 * buildLabels — semantic labels layer for the NAFAS tactical 3D monitor.
 *
 * Cartographic hierarchy (strict, altitude-driven):
 *   • DISTRICTS   — uppercase mono, visible 4km–40km, fades in as camera lifts.
 *   • STREETS     — thin polylines + small mono midlabels, active 800m–5km.
 *   • POIs        — serif markers (Fraunces), richest at 200m–3km; Amina is amber.
 * The three tiers never compete: each fades for the next so the atlas stays legible.
 */

import * as Cesium from "cesium";

type Lon = number;
type Lat = number;
type LonLat = [Lon, Lat];

type Exposure = "high" | "medium" | "low";

interface DistrictProps {
  kind: "district";
  name: string;
  centroid: LonLat;
  population?: number;
  exposure: Exposure;
}

type StreetPriority = 1 | 2 | 3;

interface StreetProps {
  kind: "street";
  name: string;
  priority: StreetPriority;
}

type PoiType =
  | "school"
  | "home"
  | "hospital"
  | "port"
  | "station"
  | "university"
  | "mosque"
  | "oasis"
  | "beach";

interface PoiProps {
  kind: "poi";
  name: string;
  type: PoiType;
  anchor?: "amina";
}

interface PointGeom {
  type: "Point";
  coordinates: LonLat;
}
interface LineGeom {
  type: "LineString";
  coordinates: LonLat[];
}

interface DistrictFeature {
  type: "Feature";
  properties: DistrictProps;
  geometry: PointGeom;
}
interface StreetFeature {
  type: "Feature";
  properties: StreetProps;
  geometry: LineGeom;
}
interface PoiFeature {
  type: "Feature";
  properties: PoiProps;
  geometry: PointGeom;
}

interface FC<T> {
  type: "FeatureCollection";
  features: T[];
}

const DISTRICT_FONT = "500 14px 'JetBrains Mono', monospace";
const STREET_FONT = "400 9px 'JetBrains Mono', monospace";
const POI_FONT = "500 11px 'Fraunces', Georgia, serif";
const POI_FONT_ITALIC = "500 italic 11px 'Fraunces', Georgia, serif";

const COLOR_AMBER = "#EF9F27";
const COLOR_SURFACE = "#F7F6F2";
const COLOR_INK3 = "#9A998F";
const COLOR_OUTLINE_DEEP = "rgba(10,15,20,0.95)";
const COLOR_OUTLINE_MID = "rgba(10,15,20,0.9)";

const POI_FILL_RED = "#E24B4A";
const POI_FILL_CYAN = "#3EC9D0";
const POI_FILL_GREEN = "#3EC99A";

function districtFill(exposure: Exposure): string {
  if (exposure === "high") return COLOR_AMBER;
  if (exposure === "medium") return COLOR_SURFACE;
  return COLOR_INK3;
}

function streetColor(priority: StreetPriority): Cesium.Color {
  if (priority === 1) {
    return Cesium.Color.fromCssColorString(COLOR_SURFACE).withAlpha(0.35);
  }
  if (priority === 2) {
    return Cesium.Color.fromCssColorString(COLOR_INK3).withAlpha(0.3);
  }
  return Cesium.Color.fromCssColorString(COLOR_INK3).withAlpha(0.2);
}

function streetWidth(priority: StreetPriority): number {
  if (priority === 1) return 2;
  if (priority === 2) return 1.5;
  return 1;
}

function poiDotColor(type: PoiType): Cesium.Color {
  if (type === "school" || type === "home" || type === "hospital") {
    return Cesium.Color.fromCssColorString(POI_FILL_RED);
  }
  if (type === "port" || type === "station" || type === "beach") {
    return Cesium.Color.fromCssColorString(POI_FILL_CYAN);
  }
  return Cesium.Color.fromCssColorString(POI_FILL_GREEN);
}

/** Midpoint of a polyline by cumulative arc length (in lon/lat space — close enough at city scale). */
function polylineMidpoint(coords: LonLat[]): LonLat {
  if (coords.length === 0) return [0, 0];
  if (coords.length === 1) return coords[0];

  let total = 0;
  const segLens: number[] = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const dx = coords[i + 1][0] - coords[i][0];
    const dy = coords[i + 1][1] - coords[i][1];
    const len = Math.sqrt(dx * dx + dy * dy);
    segLens.push(len);
    total += len;
  }
  const target = total / 2;
  let walked = 0;
  for (let i = 0; i < segLens.length; i++) {
    if (walked + segLens[i] >= target) {
      const t = segLens[i] === 0 ? 0 : (target - walked) / segLens[i];
      const lon = coords[i][0] + (coords[i + 1][0] - coords[i][0]) * t;
      const lat = coords[i][1] + (coords[i + 1][1] - coords[i][1]) * t;
      return [lon, lat];
    }
    walked += segLens[i];
  }
  return coords[coords.length - 1];
}

function coordsToCartesians(coords: LonLat[]): Cesium.Cartesian3[] {
  const flat: number[] = [];
  for (const [lon, lat] of coords) flat.push(lon, lat);
  return Cesium.Cartesian3.fromDegreesArray(flat);
}

export async function buildLabels(
  viewer: Cesium.Viewer,
): Promise<{ entities: Cesium.Entity[]; dispose: () => void }> {
  const entities: Cesium.Entity[] = [];

  const [districtsRes, streetsRes, poiRes] = await Promise.all([
    fetch("/data/districts.geojson"),
    fetch("/data/streets.geojson"),
    fetch("/data/poi.geojson"),
  ]);

  const [districtsFc, streetsFc, poiFc] = (await Promise.all([
    districtsRes.json(),
    streetsRes.json(),
    poiRes.json(),
  ])) as [FC<DistrictFeature>, FC<StreetFeature>, FC<PoiFeature>];

  // ── DISTRICTS ─────────────────────────────────────────────────────
  for (const f of districtsFc.features) {
    const p = f.properties;
    const [lon, lat] = f.geometry.coordinates;
    const fill = districtFill(p.exposure);

    entities.push(
      viewer.entities.add({
        id: `label-district-${p.name}`,
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
        label: {
          text: p.name.toUpperCase(),
          font: DISTRICT_FONT,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          fillColor: Cesium.Color.fromCssColorString(fill),
          outlineColor: Cesium.Color.fromCssColorString(COLOR_OUTLINE_DEEP),
          outlineWidth: 4,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          scaleByDistance: new Cesium.NearFarScalar(4000, 1.2, 40000, 0.7),
          translucencyByDistance: new Cesium.NearFarScalar(2000, 0.0, 3500, 1.0),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      }),
    );

    // High-exposure districts get a pulsing amber dot offset beside the label.
    if (p.exposure === "high") {
      const pulse = new Cesium.CallbackProperty((time) => {
        const ms = Cesium.JulianDate.toDate(
          time ?? Cesium.JulianDate.now(),
        ).getTime();
        const phase = (ms % 1400) / 1400;
        const alpha = 0.55 + 0.45 * (0.5 - 0.5 * Math.cos(phase * Math.PI * 2));
        return Cesium.Color.fromCssColorString(COLOR_AMBER).withAlpha(alpha);
      }, false);

      // ~30m east offset in lon at latitude 33.9 → ≈ 0.00032°
      const dotLon = lon + 0.00032;

      entities.push(
        viewer.entities.add({
          id: `label-district-pulse-${p.name}`,
          position: Cesium.Cartesian3.fromDegrees(dotLon, lat, 0),
          point: {
            pixelSize: 6,
            color: pulse,
            outlineColor: Cesium.Color.fromCssColorString(
              COLOR_OUTLINE_DEEP,
            ).withAlpha(0.9),
            outlineWidth: 1,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            scaleByDistance: new Cesium.NearFarScalar(4000, 1.2, 40000, 0.7),
            translucencyByDistance: new Cesium.NearFarScalar(
              2000,
              0.0,
              3500,
              1.0,
            ),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        }),
      );
    }
  }

  // ── STREETS ───────────────────────────────────────────────────────
  for (const f of streetsFc.features) {
    const p = f.properties;
    const coords = f.geometry.coordinates;
    const positions = coordsToCartesians(coords);
    const color = streetColor(p.priority);
    const width = streetWidth(p.priority);

    entities.push(
      viewer.entities.add({
        id: `label-street-line-${p.name}`,
        polyline: {
          positions,
          width,
          clampToGround: true,
          material: color,
        },
      }),
    );

    const [mlon, mlat] = polylineMidpoint(coords);
    const labelText = p.priority === 1 ? p.name.toUpperCase() : p.name;

    entities.push(
      viewer.entities.add({
        id: `label-street-text-${p.name}`,
        position: Cesium.Cartesian3.fromDegrees(mlon, mlat, 0),
        label: {
          text: labelText,
          font: STREET_FONT,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          fillColor: Cesium.Color.fromCssColorString(COLOR_INK3),
          outlineColor: Cesium.Color.fromCssColorString(COLOR_OUTLINE_MID),
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          translucencyByDistance: new Cesium.NearFarScalar(4000, 0.0, 1500, 1.0),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      }),
    );
  }

  // ── POIs ──────────────────────────────────────────────────────────
  for (const f of poiFc.features) {
    const p = f.properties;
    const [lon, lat] = f.geometry.coordinates;
    const isAmina = p.anchor === "amina";

    // dot
    entities.push(
      viewer.entities.add({
        id: `label-poi-dot-${p.name}`,
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
        point: {
          pixelSize: 5,
          color: poiDotColor(p.type),
          outlineColor: Cesium.Color.WHITE.withAlpha(0.8),
          outlineWidth: 1.5,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          scaleByDistance: new Cesium.NearFarScalar(300, 1.15, 3500, 0.55),
          translucencyByDistance: new Cesium.NearFarScalar(1600, 1.0, 6000, 0.0),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      }),
    );

    // label
    const text = isAmina ? "FOYER AMINA — GHANNOUCH" : p.name;
    const fill = isAmina ? COLOR_AMBER : COLOR_SURFACE;
    const font = isAmina ? POI_FONT_ITALIC : POI_FONT;

    entities.push(
      viewer.entities.add({
        id: `label-poi-text-${p.name}`,
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
        label: {
          text,
          font,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          fillColor: Cesium.Color.fromCssColorString(fill),
          outlineColor: Cesium.Color.fromCssColorString(COLOR_OUTLINE_DEEP),
          outlineWidth: 3,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          pixelOffset: new Cesium.Cartesian2(10, 0),
          scaleByDistance: new Cesium.NearFarScalar(300, 1.15, 3500, 0.55),
          translucencyByDistance: new Cesium.NearFarScalar(1600, 1.0, 6000, 0.0),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      }),
    );
  }

  const dispose = () => {
    for (const e of entities) {
      try {
        viewer.entities.remove(e);
      } catch {
        /* viewer already torn down */
      }
    }
    entities.length = 0;
  };

  return { entities, dispose };
}
