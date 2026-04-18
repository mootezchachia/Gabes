// buildSensors.ts — Tactical sensor entity factory for the Cesium monitor3d view.
// Responsibilities: (1) fetch /data/sensors.json, (2) spawn a color/size-graded
// point + label Cesium entity per sensor with category-aware install height,
// (3) add a time-sampled pulsing ground halo for critical (so2 > 250) sensors,
// (4) attach all sensor fields to entity.properties for click-to-inspect in the
// existing TacticalInspect panel, and (5) return a dispose() that removes every
// entity it created so CesiumScene can wire it into its cleanup pipeline.

import * as Cesium from "cesium";
import type { Sensor } from "@/lib/monitor/layers";

type Category = NonNullable<Sensor["category"]>;

const INSTALL_HEIGHT: Record<Category, number> = {
  school: 15,
  hospital: 15,
  mosque: 15,
  municipal: 15,
  rooftop: 12,
  industrial_perim: 4,
  port: 4,
  coastal_station: 3,
  traffic: 3,
  oasis: 3,
  marine: 2,
  regional: 3,
};

function heightFor(category: Category | undefined): number {
  if (!category) return 4;
  return INSTALL_HEIGHT[category] ?? 4;
}

function pixelSizeFor(sensor: Sensor): number {
  if (sensor.critical) return 16;
  if (sensor.so2 > 200) return 13;
  if (sensor.so2 > 100) return 10;
  return 8;
}

function fillFor(sensor: Sensor): Cesium.Color {
  if (sensor.critical) {
    return Cesium.Color.fromCssColorString("#E24B4A").withAlpha(0.85);
  }
  if (sensor.so2 > 200) {
    return Cesium.Color.fromCssColorString("#E24B4A").withAlpha(0.55);
  }
  if (sensor.so2 > 100) {
    return Cesium.Color.fromCssColorString("#EF9F27").withAlpha(0.55);
  }
  return Cesium.Color.fromCssColorString("#3EC9D0").withAlpha(0.55);
}

function strokeFor(sensor: Sensor): Cesium.Color {
  if (sensor.critical || sensor.so2 > 200) {
    return Cesium.Color.fromCssColorString("#E24B4A");
  }
  if (sensor.so2 > 100) {
    return Cesium.Color.fromCssColorString("#EF9F27");
  }
  return Cesium.Color.fromCssColorString("#3EC9D0");
}

export async function buildSensors(
  viewer: Cesium.Viewer,
): Promise<{ entities: Cesium.Entity[]; dispose: () => void }> {
  const entities: Cesium.Entity[] = [];

  let sensors: Sensor[] = [];
  try {
    const res = await fetch("/data/sensors.json");
    sensors = (await res.json()) as Sensor[];
  } catch (err) {
    console.warn("[buildSensors] fetch failed:", err);
    return { entities, dispose: () => undefined };
  }

  if (viewer.isDestroyed()) {
    return { entities, dispose: () => undefined };
  }

  for (const s of sensors) {
    const height = heightFor(s.category);
    const fill = fillFor(s);
    const stroke = strokeFor(s);
    const labelFill = s.critical
      ? Cesium.Color.fromCssColorString("#E24B4A")
      : Cesium.Color.WHITE;

    const entity = viewer.entities.add({
      id: `sensor-${s.id}`,
      position: Cesium.Cartesian3.fromDegrees(s.lon, s.lat, height),
      point: {
        pixelSize: pixelSizeFor(s),
        color: fill,
        outlineColor: stroke,
        outlineWidth: s.critical ? 2.5 : 1.5,
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(800, 1.4, 20000, 0.6),
      },
      label: {
        text: `${s.code ?? `NFS-${s.id}`}\n${s.so2} µg/m³`,
        font: "500 10px 'JetBrains Mono', monospace",
        fillColor: labelFill,
        outlineColor: Cesium.Color.fromCssColorString("rgba(10,15,20,0.95)"),
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(14, -2),
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        translucencyByDistance: new Cesium.NearFarScalar(600, 1.0, 6000, 0.0),
        scaleByDistance: new Cesium.NearFarScalar(300, 1.2, 5000, 0.5),
      },
      description: `${s.name ?? s.code ?? `Capteur ${s.id}`}<br/>${s.address ?? ""}<br/>SO₂ ${s.so2} µg/m³ · NO₂ ${s.no2} · PM2.5 ${s.pm25 ?? "—"}<br/>ring ${s.ring}`,
      properties: new Cesium.PropertyBag({
        kind: "sensor",
        sensorId: s.id,
        code: s.code,
        name: s.name,
        address: s.address,
        district: s.district,
        category: s.category,
        so2: s.so2,
        no2: s.no2,
        pm25: s.pm25,
        aqi: s.aqi,
        ring: s.ring,
        installed: s.installed,
        uptime_pct: s.uptime_pct,
        status: s.status,
        critical: s.critical ?? false,
      }),
    });
    entities.push(entity);

    if (s.critical) {
      const haloMaterial = Cesium.Color.fromCssColorString("#E24B4A").withAlpha(
        0.18,
      );
      const halo = viewer.entities.add({
        id: `sensor-${s.id}-halo`,
        position: Cesium.Cartesian3.fromDegrees(s.lon, s.lat, 0),
        ellipse: {
          semiMajorAxis: new Cesium.CallbackProperty(() => {
            const t = ((Date.now() / 1000) % (2 * Math.PI)) * 1.2;
            return 80 + Math.sin(t) * 30;
          }, false),
          semiMinorAxis: new Cesium.CallbackProperty(() => {
            const t = ((Date.now() / 1000) % (2 * Math.PI)) * 1.2;
            return 80 + Math.sin(t) * 30;
          }, false),
          material: new Cesium.ColorMaterialProperty(haloMaterial),
          height: 0,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          outline: false,
        },
        properties: new Cesium.PropertyBag({
          kind: "sensor-halo",
          sensorId: s.id,
        }),
      });
      entities.push(halo);
    }
  }

  const dispose = () => {
    if (viewer.isDestroyed()) return;
    for (const e of entities) {
      try {
        viewer.entities.remove(e);
      } catch {
        // ignore removal errors — viewer may be mid-teardown
      }
    }
    entities.length = 0;
  };

  return { entities, dispose };
}
