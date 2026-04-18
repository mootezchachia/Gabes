"use client";

import { useMonitor, type Timeframe } from "@/lib/monitor/store";

const PILLS: Timeframe[] = [
  "1H",
  "6H",
  "24H",
  "48H",
  "7J",
  "30J",
  "1A",
  "TOUT",
];

const MONO =
  "var(--font-jetbrains), ui-monospace, SFMono-Regular, Menlo, monospace";

export function TimeframePills() {
  const timeframe = useMonitor((s) => s.timeframe);
  const setTimeframe = useMonitor((s) => s.setTimeframe);

  return (
    <div
      role="group"
      aria-label="Fenêtre temporelle"
      className="absolute top-16 left-[296px] z-30 flex items-center gap-[2px] rounded-full border border-white/10 bg-black/40 p-[3px] shadow-[0_10px_30px_-16px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.03)_inset] backdrop-blur-xl"
    >
      <span
        style={{ fontFamily: MONO }}
        aria-hidden
        className="hidden pl-[10px] pr-[6px] text-[9px] uppercase tracking-[0.22em] text-[color:var(--nafas-ink3)]/60 lg:inline-block"
      >
        Fenêtre
      </span>
      {PILLS.map((label) => {
        const active = label === timeframe;
        return (
          <button
            key={label}
            type="button"
            aria-pressed={active}
            onClick={() => setTimeframe(label)}
            style={{ fontFamily: MONO }}
            className={
              "relative h-[22px] min-w-[34px] cursor-pointer rounded-full px-[10px] text-[11px] uppercase tracking-[0.14em] transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--nafas-accent2)] " +
              (active
                ? "bg-[color:var(--nafas-accent2)] text-[color:var(--nafas-bg)] shadow-[0_0_18px_-6px_rgba(61,201,154,0.85)]"
                : "text-[color:var(--nafas-ink3)] hover:bg-white/[0.05] hover:text-[color:var(--nafas-surface)]")
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
