"use client";

import { BriefAI } from "./BriefAI";
import { Posture } from "./Posture";
import { EventsFeed } from "./EventsFeed";

export function RightPanel() {
  return (
    <aside
      className="absolute top-12 right-0 bottom-72 z-30 flex w-[340px] flex-col gap-5 overflow-y-auto border-l border-white/10 bg-[color:var(--nafas-bg2)]/70 p-5 backdrop-blur-xl"
      aria-label="Panneau latéral droit — Brief AI, Posture, Événements"
    >
      <BriefAI />
      <div className="h-px w-full bg-white/5" aria-hidden />
      <Posture />
      <div className="h-px w-full bg-white/5" aria-hidden />
      <EventsFeed />
    </aside>
  );
}
