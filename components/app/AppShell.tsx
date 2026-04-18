"use client";

import type { ReactNode } from "react";
import { AppQueryProvider } from "@/lib/app/query";
import { TopBar } from "./TopBar";
import { LeftRail } from "./LeftRail";

/**
 * Top-level shell. Wraps every /app/* route with the rail + top bar +
 * React Query provider. Intentionally kept thin — route-level Suspense
 * and data loading happen inside the rendered page, not here.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppQueryProvider>
      <div className="h-dvh flex flex-col bg-[color:var(--nafas-bg)] text-[color:var(--nafas-surface)]">
        <TopBar />
        <div className="flex-1 min-h-0 flex">
          <LeftRail />
          {/*
           * `h-full` ensures <main> has an explicit pixel height even before
           * flex layout resolves (critical for Cesium — its viewer reads
           * container dimensions synchronously at mount and a 0-height
           * container on /app/carte produced a black globe with only
           * entity pins visible).
           */}
          <main className="flex-1 min-w-0 min-h-0 h-full relative">{children}</main>
        </div>
        {/* Spacer for mobile bottom tab bar */}
        <div aria-hidden className="md:hidden h-14 shrink-0" />
      </div>
    </AppQueryProvider>
  );
}
