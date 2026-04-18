import { distanceMeters } from "./geo";
import type { LonLat, Zone } from "./types";

/**
 * Prefix used for all ntfy topics owned by this deployment. Defaults to
 * `nafas-gabes` but can be overridden via NEXT_PUBLIC_NTFY_TOPIC_PREFIX.
 */
export function getTopicPrefix(): string {
  const fromEnv =
    (typeof process !== "undefined" &&
      process.env &&
      process.env.NEXT_PUBLIC_NTFY_TOPIC_PREFIX) ||
    "";
  return fromEnv || "nafas-gabes";
}

/** Sanitize a zone slug to be safe for ntfy topic URLs. */
export function sanitizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function topicForZone(zone: Zone, prefix = getTopicPrefix()): string {
  return `${prefix}-zone-${sanitizeSlug(zone.slug || zone.name || zone.id)}`;
}

export function generalTopic(prefix = getTopicPrefix()): string {
  return `${prefix}-general`;
}

export interface AssignTopicsOptions {
  /** How many zones to suggest. Default 3. */
  maxZones?: number;
  /** Max radius in metres to consider. Default 5_000. */
  radiusMeters?: number;
  /** Which zone kinds participate in suggestions. */
  allowedKinds?: ReadonlyArray<Zone["kind"]>;
  /** Optional override for the topic prefix (tests). */
  prefix?: string;
  /** Whether to prepend the general topic (default true). */
  includeGeneral?: boolean;
}

/**
 * Deterministic topic assignment.
 *
 * Given a user's home + school (either may be null), find the closest N zones
 * of eligible kinds (school / hospital / residential / coastal per §6.8 of
 * the design doc) across both points and return an ordered, deduplicated
 * list of ntfy topic slugs.
 *
 * The `general` topic is always included (first) unless explicitly disabled.
 *
 * Pure. No IO. Deterministic given identical inputs.
 */
export function assignTopics(
  homeLocation: LonLat | null,
  schoolLocation: LonLat | null,
  zones: Zone[],
  options: AssignTopicsOptions = {},
): string[] {
  const {
    maxZones = 3,
    radiusMeters = 5_000,
    allowedKinds = ["school", "hospital", "residential", "coastal"] as const,
    prefix = getTopicPrefix(),
    includeGeneral = true,
  } = options;

  const anchors: LonLat[] = [];
  if (homeLocation) anchors.push(homeLocation);
  if (schoolLocation) anchors.push(schoolLocation);

  const out: string[] = [];
  const seen = new Set<string>();
  const push = (t: string) => {
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  };

  if (includeGeneral) push(generalTopic(prefix));

  if (anchors.length === 0) return out;

  const allowed = new Set(allowedKinds);
  const scored = zones
    .filter((z) => allowed.has(z.kind))
    .map((z) => {
      // min distance to any anchor
      let min = Infinity;
      for (const a of anchors) {
        const d = distanceMeters(a, z.centroid);
        if (d < min) min = d;
      }
      return { zone: z, distance: min };
    })
    .filter((s) => s.distance <= radiusMeters)
    // Sort by distance asc, tie-break by slug for determinism.
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return (a.zone.slug || a.zone.name).localeCompare(
        b.zone.slug || b.zone.name,
      );
    });

  for (const s of scored) {
    if (out.length - (includeGeneral ? 1 : 0) >= maxZones) break;
    push(topicForZone(s.zone, prefix));
  }

  return out;
}
