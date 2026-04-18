"use client";

import { ReactNode } from "react";
import { useIntro } from "@/lib/monitor3d/introStore";

/**
 * Hides HUD chrome until the cinematic intro has progressed past a threshold
 * (0..1). Once the threshold is crossed, the child is revealed with a soft
 * blur/translate/opacity sweep using the editorial easing.
 *
 * For repeat visitors (active === false), children render immediately.
 */
export function IntroGate({
  threshold,
  children,
  className,
  as: Tag = "div",
}: {
  threshold: number;
  children: ReactNode;
  className?: string;
  /** Wrapper element. "div" by default; use "div" or leave unset in most cases. */
  as?: "div" | "section";
}) {
  const active = useIntro((s) => s.active);
  const stage = useIntro((s) => s.stage);
  const revealed = !active || stage >= threshold;

  return (
    <Tag
      className={className}
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0)" : "translateY(8px)",
        filter: revealed ? "blur(0px)" : "blur(6px)",
        transition:
          "opacity 520ms var(--ease-editorial), transform 520ms var(--ease-editorial), filter 600ms var(--ease-editorial)",
        pointerEvents: revealed ? undefined : "none",
      }}
    >
      {children}
    </Tag>
  );
}
