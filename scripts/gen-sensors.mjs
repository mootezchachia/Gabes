// Generates 42 pseudo-sensors in 3 concentric rings around GCT, south-biased by
// prevailing wind. Values are plausible (not measured), labelled as simulated.
// Run: node scripts/gen-sensors.mjs
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const GCT = [10.1178, 33.9312];
const AMINA = [10.1098, 33.9189];
const SCHOOL = [10.1054, 33.9121];
const WIND_BEARING_DEG = 195; // wind *blowing toward* 195° (roughly SSW)

// km → degrees roughly (at 34°N)
const KM_LON = 1 / 93;
const KM_LAT = 1 / 111;

function polar(centerLon, centerLat, bearingDeg, distKm) {
  const br = (bearingDeg * Math.PI) / 180;
  return [
    centerLon + Math.sin(br) * distKm * KM_LON,
    centerLat + Math.cos(br) * distKm * KM_LAT,
  ];
}

function rand(seed) {
  // deterministic LCG
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const rng = rand(42);

const sensors = [];
let id = 0;

// Ring 1 — 12 sensors @ ~0.5 km, values 180–340 biased high downwind
for (let i = 0; i < 12; i++) {
  const bearing = (i / 12) * 360 + rng() * 20 - 10;
  const [lon, lat] = polar(GCT[0], GCT[1], bearing, 0.5 + rng() * 0.2);
  // bias: closer to downwind bearing → higher
  const downwindProx = Math.cos(((bearing - WIND_BEARING_DEG) * Math.PI) / 180);
  const so2 = Math.round(220 + downwindProx * 110 + rng() * 25);
  sensors.push({
    id: ++id,
    lon: +lon.toFixed(5),
    lat: +lat.toFixed(5),
    ring: 1,
    so2,
    no2: Math.round(30 + downwindProx * 40 + rng() * 8),
    aqi: Math.round(so2 / 3 + rng() * 12),
    status: "simulated",
  });
}

// Ring 2 — 18 sensors @ ~1.5 km
for (let i = 0; i < 18; i++) {
  const bearing = (i / 18) * 360 + rng() * 15 - 7.5;
  const [lon, lat] = polar(GCT[0], GCT[1], bearing, 1.4 + rng() * 0.35);
  const downwindProx = Math.cos(((bearing - WIND_BEARING_DEG) * Math.PI) / 180);
  const so2 = Math.round(95 + downwindProx * 75 + rng() * 20);
  sensors.push({
    id: ++id,
    lon: +lon.toFixed(5),
    lat: +lat.toFixed(5),
    ring: 2,
    so2,
    no2: Math.round(18 + downwindProx * 28 + rng() * 7),
    aqi: Math.round(so2 / 3 + rng() * 10),
    status: "simulated",
  });
}

// Ring 3 — 12 sensors @ ~3 km
for (let i = 0; i < 12; i++) {
  const bearing = (i / 12) * 360 + rng() * 20 - 10;
  const [lon, lat] = polar(GCT[0], GCT[1], bearing, 2.8 + rng() * 0.6);
  const downwindProx = Math.cos(((bearing - WIND_BEARING_DEG) * Math.PI) / 180);
  const so2 = Math.round(40 + downwindProx * 30 + rng() * 12);
  sensors.push({
    id: ++id,
    lon: +lon.toFixed(5),
    lat: +lat.toFixed(5),
    ring: 3,
    so2,
    no2: Math.round(8 + downwindProx * 14 + rng() * 4),
    aqi: Math.round(so2 / 3 + rng() * 6),
    status: "simulated",
  });
}

// Override nearest-to-school sensor id 1 ring tweaks to land the exact Amina point
const nearestToSchool = sensors.reduce((acc, s) => {
  const d = Math.hypot(s.lon - SCHOOL[0], s.lat - SCHOOL[1]);
  return !acc || d < acc.d ? { s, d } : acc;
}, null);
if (nearestToSchool) {
  nearestToSchool.s.so2 = 340;
  nearestToSchool.s.aqi = 142;
  nearestToSchool.s.highlight = "chatt-essalam";
}

// GCT point (the industrial footprint)
const gctGeoJson = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Groupe Chimique Tunisien", kind: "industrial" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [10.108, 33.938],
            [10.128, 33.938],
            [10.132, 33.928],
            [10.126, 33.922],
            [10.110, 33.922],
            [10.105, 33.930],
            [10.108, 33.938],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "Chimney 1", kind: "stack" },
      geometry: { type: "Point", coordinates: [10.1165, 33.9325] },
    },
    {
      type: "Feature",
      properties: { name: "Chimney 2", kind: "stack" },
      geometry: { type: "Point", coordinates: [10.1190, 33.9305] },
    },
    {
      type: "Feature",
      properties: { name: "Chimney 3", kind: "stack" },
      geometry: { type: "Point", coordinates: [10.1210, 33.9285] },
    },
    {
      type: "Feature",
      properties: { name: "Chimney 4", kind: "stack" },
      geometry: { type: "Point", coordinates: [10.1145, 33.9295] },
    },
  ],
};

const landmarks = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "École Chatt Essalam", kind: "school", incident: "2025-10-14" },
      geometry: { type: "Point", coordinates: SCHOOL },
    },
    {
      type: "Feature",
      properties: { name: "Foyer Amina", kind: "home" },
      geometry: { type: "Point", coordinates: AMINA },
    },
    {
      type: "Feature",
      properties: { name: "Hôpital Habib Bourguiba Gabès", kind: "hospital" },
      geometry: { type: "Point", coordinates: [10.0983, 33.8838] },
    },
  ],
};

const dataDir = resolve(process.cwd(), "public/data");
writeFileSync(resolve(dataDir, "sensors.json"), JSON.stringify(sensors, null, 2));
writeFileSync(resolve(dataDir, "gct.geojson"), JSON.stringify(gctGeoJson, null, 2));
writeFileSync(resolve(dataDir, "landmarks.geojson"), JSON.stringify(landmarks, null, 2));

console.log(`Wrote ${sensors.length} sensors + gct.geojson + landmarks.geojson`);
