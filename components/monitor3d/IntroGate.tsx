"use client";

import { ReactNode } from "react";
import { useIntro } from "@/lib/monitor3d/introStore";

/**
 * Hides HUD chrome until the cinematic intro has progressed past a threshold
 * (0..1). Once the threshold is crossed, the child fades in.
 *
 * IMPORTANT: This wrapper uses ONLY opacity + visibility for the reveal —
 * never `transform` or `filter`. Both of those create a new containing
 * block in CSS, which would re-anchor any `position: fixed` / `absolute`
 * descendants to this wrapper instead of the viewport, breaking panel
 * placement. Opacity is safe.
 *
 * For repeat visitors (active === false), children render immediately.
 */
export function IntroGate({
  threshold,
  children,
  className,
}: {
  threshold: number;
  children: ReactNode;
  className?: string;
}) {
  const active = useIntro((s) => s.active);
  const stage = useIntro((s) => s.stage);
  const revealed = !active || stage >= threshold;

  return (
    <div
      className={className}
      style={{
        opacity: revealed ? 1 : 0,
        visibility: revealed ? "visible" : "hidden",
        transition:
          "opacity 540ms var(--ease-editorial), visibility 0ms linear 540ms",
        pointerEvents: revealed ? undefined : "none",
      }}
      aria-hidden={!revealed ? "true" : undefined}
    >
      {children}
    </div>
  );
}
