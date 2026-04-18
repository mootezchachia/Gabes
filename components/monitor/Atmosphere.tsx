"use client";

/**
 * Atmosphere — fullscreen post-FX overlay rendered above Mapbox/deck.gl but
 * below the chrome. Four compounding layers:
 *
 *   1. inner focus vignette  — subtle dark ring, pulls the eye center
 *   2. outer edge vignette   — deeper black ring at the viewport rim
 *   3. amber warmth          — barely-there orange radial, anchors the scene
 *                              with the GCT plume's heat-signature
 *   4. film grain             — SVG-noise overlay at ~3% opacity, breaks the
 *                              synthetic flatness of the dark style
 *
 * All four are `pointer-events-none` and fixed to the viewport.
 */
export function Atmosphere() {
  return (
    <>
      {/* inner focus vignette */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[11]"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 50%, transparent 40%, rgba(10,15,20,0.28) 75%, rgba(10,15,20,0.55) 100%)",
        }}
      />

      {/* outer edge vignette — harder cut at corners */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[12]"
        style={{
          background:
            "radial-gradient(ellipse 110% 80% at 50% 50%, transparent 55%, rgba(6,10,15,0.45) 95%, rgba(6,10,15,0.85) 100%)",
        }}
      />

      {/* warm horizon tint — amber whisper near the bottom of the frame */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[13]"
        style={{
          background:
            "radial-gradient(ellipse 90% 48% at 52% 110%, rgba(239,159,39,0.08) 0%, rgba(239,159,39,0.03) 35%, transparent 65%)",
          mixBlendMode: "screen",
        }}
      />

      {/* film grain — small SVG noise tile, very low opacity */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[14]"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='7'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.18'/></svg>")`,
          backgroundSize: "220px 220px",
          opacity: 0.045,
          mixBlendMode: "overlay",
        }}
      />
    </>
  );
}
