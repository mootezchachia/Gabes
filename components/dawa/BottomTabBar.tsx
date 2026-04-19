"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export type DawaTab = "statut" | "alertes" | "moi";

interface Props {
  active: DawaTab;
}

const TABS: Array<{ key: DawaTab; label: string; icon: React.ReactNode }> = [
  {
    key: "statut",
    label: "Statut",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: "alertes",
    label: "Alertes",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M18 16v-5a6 6 0 10-12 0v5l-2 2h16l-2-2zM10 20a2 2 0 004 0"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    key: "moi",
    label: "Moi",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M4.5 20c0-3.7 3.4-6.5 7.5-6.5s7.5 2.8 7.5 6.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export function BottomTabBar({ active }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  const go = useCallback(
    (tab: DawaTab) => {
      const sp = new URLSearchParams(params?.toString() ?? "");
      if (tab === "statut") sp.delete("tab");
      else sp.set("tab", tab);
      const qs = sp.toString();
      router.push(`/dawa${qs ? "?" + qs : ""}`, { scroll: false });
    },
    [params, router],
  );

  return (
    <nav
      className="fixed left-1/2 -translate-x-1/2 bottom-0 w-full max-w-[480px] z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navigation Dawa"
    >
      <div
        className="mx-3 mb-3 rounded-2xl border border-white/[0.08] bg-[color:var(--nafas-bg2)]/90 backdrop-blur-md"
        style={{
          boxShadow:
            "0 20px 48px -24px rgba(0,0,0,0.9), inset 0 1px 0 0 rgba(255,255,255,0.05)",
        }}
      >
        <ul className="grid grid-cols-3">
          {TABS.map((t) => {
            const isActive = t.key === active;
            return (
              <li key={t.key}>
                <button
                  type="button"
                  onClick={() => go(t.key)}
                  aria-current={isActive ? "page" : undefined}
                  className={
                    "w-full h-14 flex flex-col items-center justify-center gap-0.5 transition-colors " +
                    (isActive
                      ? "text-[color:var(--nafas-accent2)]"
                      : "text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)]")
                  }
                >
                  {t.icon}
                  <span
                    className="text-[10px] tracking-[0.22em] uppercase"
                    style={{ fontFamily: "var(--font-jetbrains), monospace" }}
                  >
                    {t.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
