/**
 * buildGct — constructs the Groupe Chimique Tunisien (GCT) phosphate complex
 * as a collection of small Cesium entities instead of one billboard polygon.
 *
 * Architecture:
 *   • Fetches /data/gct.geojson (features keyed by `properties.kind`).
 *   • Each kind maps to a small helper which pushes one or more entities
 *     onto a local array (footprint/building/tank/gypsum_stack/stack).
 *   • Active chimneys get a pulsing red top marker driven by CallbackProperty.
 *   • Returns { entities, dispose } so the caller can cleanly wipe the scene.
 */

import * as Cesium from "cesium";

type Lon = number;
type Lat = number;
type Position = [Lon, Lat];

interface BaseProps {
  kind: string;
  label?: string;
}
interface FootprintProps extends BaseProps {
  kind: "footprint";
}
interface BuildingProps extends BaseProps {
  kind: "building";
  height: number;
}
interface TankProps extends BaseProps {
  kind: "tank";
  height: number;
  radius: number;
}
interface GypsumProps extends BaseProps {
  kind: "gypsum_stack";
  height: number;
}
interface StackProps extends BaseProps {
  kind: "stack";
  height: number;
  radius_top: number;
  radius_bottom: number;
  active: boolean;
}

type AnyProps =
  | FootprintProps
  | BuildingProps
  | TankProps
  | GypsumProps
  | StackProps
  | BaseProps;

interface PointGeometry {
  type: "Point";
  coordinates: Position;
}
interface PolygonGeometry {
  type: "Polygon";
  coordinates: Position[][];
}
interface GeoFeature {
  type: "Feature";
  properties: AnyProps;
  geometry: PointGeometry | PolygonGeometry;
}
interface FeatureCollection {
  type: "FeatureCollection";
  features: GeoFeature[];
}

/** Compute centroid of a polygon ring (first ring only). */
function ringCentroid(ring: Position[]): Position {
  let lon = 0;
  let lat = 0;
  const n = ring.length - 1; // last point equals first
  for (let i = 0; i < n; i++) {
    lon += ring[i][0];
    lat += ring[i][1];
  }
  return [lon / n, lat / n];
}

/** Flatten a polygon ring into a Cartesian3[] for Cesium polygons/polylines. */
function ringToCartesians(ring: Position[]): Cesium.Cartesian3[] {
  const flat: number[] = [];
  for (const [lon, lat] of ring) {
    flat.push(lon, lat);
  }
  return Cesium.Cartesian3.fromDegreesArray(flat);
}

const LABEL_FONT_MONO = "500 13px 'JetBrains Mono', monospace";
const LABEL_FONT_TITLE = "600 18px 'Fraunces', Georgia, serif";

/** Shared label styling helper — returns a LabelGraphics.ConstructorOptions. */
function monoLabel(
  text: string,
  fillCss: string,
): Cesium.LabelGraphics.ConstructorOptions {
  return {
    text,
    font: LABEL_FONT_MONO,
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    fillColor: Cesium.Color.fromCssColorString(fillCss),
    outlineColor: Cesium.Color.fromCssColorString("rgba(10,15,20,0.9)"),
    outlineWidth: 2.5,
    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    eyeOffset: new Cesium.Cartesian3(0, 0, -400),
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    pixelOffset: new Cesium.Cartesian2(0, -6),
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    translucencyByDistance: new Cesium.NearFarScalar(2000, 1.0, 40000, 0.3),
  };
}

export async function buildGct(
  viewer: Cesium.Viewer,
): Promise<{ entities: Cesium.Entity[]; dispose: () => void }> {
  const entities: Cesium.Entity[] = [];

  const res = await fetch("/data/gct.geojson");
  const fc = (await res.json()) as FeatureCollection;

  for (const feature of fc.features) {
    const props = feature.properties;
    const kind = props.kind;

    // ── Footprint ────────────────────────────────────────────────
    if (kind === "footprint" && feature.geometry.type === "Polygon") {
      const ring = feature.geometry.coordinates[0];
      const positions = ringToCartesians(ring);

      entities.push(
        viewer.entities.add({
          id: "gct-footprint-line",
          polyline: {
            positions,
            width: 2,
            clampToGround: true,
            material: new Cesium.PolylineDashMaterialProperty({
              color: Cesium.Color.fromCssColorString("#8A7C5A").withAlpha(0.7),
              dashLength: 18,
            }),
          },
        }),
      );

      const [clon, clat] = ringCentroid(ring);
      const labelText =
        (props as FootprintProps).label ?? "GCT · COMPLEXE PHOSPHATIER";
      entities.push(
        viewer.entities.add({
          id: "gct-footprint-label",
          position: Cesium.Cartesian3.fromDegrees(clon, clat, 0),
          label: monoLabel(labelText.toUpperCase(), "#F7F6F2"),
        }),
      );
      continue;
    }

    // ── Buildings ────────────────────────────────────────────────
    if (kind === "building" && feature.geometry.type === "Polygon") {
      const bp = props as BuildingProps;
      const ring = feature.geometry.coordinates[0];
      const positions = ringToCartesians(ring);
      const deep = bp.height > 30;
      const fill = Cesium.Color.fromCssColorString(
        deep ? "#2A2218" : "#2E2722",
      ).withAlpha(0.92);
      entities.push(
        viewer.entities.add({
          id: `gct-building-${bp.label ?? entities.length}`,
          polygon: {
            hierarchy: new Cesium.PolygonHierarchy(positions),
            height: 0,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            extrudedHeight: bp.height,
            extrudedHeightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
            material: fill,
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString("#5A4E42"),
          },
        }),
      );
      continue;
    }

    // ── Tanks ────────────────────────────────────────────────────
    if (kind === "tank" && feature.geometry.type === "Point") {
      const tp = props as TankProps;
      const [lon, lat] = feature.geometry.coordinates;
      // center of cylinder = base + height/2 (cylinder is centered at its position)
      const bodyPosition = Cesium.Cartesian3.fromDegrees(
        lon,
        lat,
        tp.height / 2,
      );
      entities.push(
        viewer.entities.add({
          id: `gct-tank-${tp.label ?? entities.length}`,
          position: bodyPosition,
          cylinder: {
            length: tp.height,
            topRadius: tp.radius,
            bottomRadius: tp.radius,
            material: Cesium.Color.fromCssColorString("#3E342C").withAlpha(
              0.95,
            ),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString("#6E5E52"),
            outlineWidth: 1,
            heightReference: Cesium.HeightReference.NONE,
          },
        }),
      );
      // cap disk on top
      const capPosition = Cesium.Cartesian3.fromDegrees(
        lon,
        lat,
        tp.height + 0.25,
      );
      entities.push(
        viewer.entities.add({
          id: `gct-tank-cap-${tp.label ?? entities.length}`,
          position: capPosition,
          cylinder: {
            length: 0.5,
            topRadius: tp.radius,
            bottomRadius: tp.radius,
            material: Cesium.Color.fromCssColorString("#4E4238").withAlpha(
              0.95,
            ),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString("#6E5E52"),
            outlineWidth: 1,
            heightReference: Cesium.HeightReference.NONE,
          },
        }),
      );
      continue;
    }

    // ── Gypsum stack ─────────────────────────────────────────────
    if (kind === "gypsum_stack" && feature.geometry.type === "Polygon") {
      const gp = props as GypsumProps;
      const ring = feature.geometry.coordinates[0];
      const positions = ringToCartesians(ring);
      entities.push(
        viewer.entities.add({
          id: "gct-gypsum",
          polygon: {
            hierarchy: new Cesium.PolygonHierarchy(positions),
            height: 0,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            extrudedHeight: gp.height,
            extrudedHeightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
            material: Cesium.Color.fromCssColorString("#4A4038").withAlpha(
              0.9,
            ),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString("#7A6A5A"),
          },
        }),
      );
      const [clon, clat] = ringCentroid(ring);
      entities.push(
        viewer.entities.add({
          id: "gct-gypsum-label",
          position: Cesium.Cartesian3.fromDegrees(clon, clat, 0),
          label: monoLabel("PHOSPHOGYPSE · 12M", "#EF9F27"),
        }),
      );
      continue;
    }

    // ── Chimneys (stacks) ────────────────────────────────────────
    if (kind === "stack" && feature.geometry.type === "Point") {
      const sp = props as StackProps;
      const [lon, lat] = feature.geometry.coordinates;
      const bodyPosition = Cesium.Cartesian3.fromDegrees(
        lon,
        lat,
        sp.height / 2,
      );
      entities.push(
        viewer.entities.add({
          id: `gct-stack-${sp.label ?? entities.length}`,
          position: bodyPosition,
          cylinder: {
            length: sp.height,
            topRadius: sp.radius_top,
            bottomRadius: sp.radius_bottom,
            material: Cesium.Color.fromCssColorString("#3A3028"),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString("#6A5E52"),
            heightReference: Cesium.HeightReference.NONE,
          },
          properties: {
            kind: "stack",
            label: sp.label,
            active: sp.active,
          },
        }),
      );

      if (sp.active) {
        const topPosition = Cesium.Cartesian3.fromDegrees(lon, lat, sp.height);
        const pulseColor = new Cesium.CallbackProperty((time) => {
          const t = Cesium.JulianDate.toDate(
            time ?? Cesium.JulianDate.now(),
          ).getTime();
          // 1 Hz pulse between 0.6 and 1.0 alpha
          const phase = (t % 1000) / 1000;
          const alpha = 0.6 + 0.4 * (0.5 - 0.5 * Math.cos(phase * Math.PI * 2));
          return Cesium.Color.fromCssColorString("#E24B4A").withAlpha(alpha);
        }, false);
        entities.push(
          viewer.entities.add({
            id: `gct-stack-marker-${sp.label ?? entities.length}`,
            position: topPosition,
            point: {
              pixelSize: 6,
              color: pulseColor,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          }),
        );
      }
      continue;
    }
  }

  // ── Site title ────────────────────────────────────────────────
  entities.push(
    viewer.entities.add({
      id: "gct-site-title",
      position: Cesium.Cartesian3.fromDegrees(10.1178, 33.9312, 200),
      label: {
        text: "GCT · GHANNOUCH",
        font: LABEL_FONT_TITLE,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        fillColor: Cesium.Color.fromCssColorString("#F7F6F2"),
        outlineColor: Cesium.Color.fromCssColorString("#0A0F14"),
        outlineWidth: 4,
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        scaleByDistance: new Cesium.NearFarScalar(1500, 1.4, 40000, 0.6),
        translucencyByDistance: new Cesium.NearFarScalar(2500, 1.0, 80000, 0.0),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -10),
      },
    }),
  );

  const dispose = () => {
    for (const e of entities) {
      try {
        viewer.entities.remove(e);
      } catch {
        /* viewer already destroyed */
      }
    }
    entities.length = 0;
  };

  return { entities, dispose };
}
