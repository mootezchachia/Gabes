export const TOKENS = {
  bg: "#0A0F14",
  bg2: "#111821",
  bg3: "#1A2330",
  surface: "#F7F6F2",
  ink2: "#4A4A42",
  ink3: "#9A998F",
  accent: "#1D9E75",
  accent2: "#3EC99A",
  danger: "#E24B4A",
  danger2: "#7A1F1F",
  amber: "#EF9F27",
  amber2: "#854F0B",
  blue: "#378ADD",
  blue2: "#185FA5",
  cyan: "#3EC9D0",
  border: "rgba(255,255,255,0.08)",
  border2: "rgba(255,255,255,0.14)",
} as const;

export const EASE = {
  editorial: "cubic-bezier(0.22, 1, 0.36, 1)",
  bloom: "cubic-bezier(0.68, -0.55, 0.27, 1.55)",
} as const;

export const GABES = {
  center: [10.0982, 33.8815] as [number, number],
  bbox: [9.8, 33.75, 10.35, 34.1] as [number, number, number, number],
  gct: [10.1178, 33.9312] as [number, number],
  schoolChattEssalam: [10.1054, 33.9121] as [number, number],
  aminaHome: [10.1098, 33.9189] as [number, number],
  hospital: [10.0983, 33.8838] as [number, number],
} as const;

export function hexToRgba(hex: string, alpha = 1): [number, number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, Math.round(alpha * 255)];
}
