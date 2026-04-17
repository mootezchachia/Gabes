"use client";

import { useEffect, useState } from "react";
import { useSim } from "@/lib/sim/store";

interface ScriptLine {
  t: number;
  text: string;
}

type Script = {
  beats: Record<"b1" | "b2" | "b3" | "b4", ScriptLine[]>;
};

/**
 * Picks the current subtitle line by (beat, beatT) against the script JSON.
 * Fake-streams the active line character by character for the ORACLE feel.
 */
export function SubtitleStrip() {
  const beat = useSim((s) => s.beat);
  const beatT = useSim((s) => s.beatT);
  const [script, setScript] = useState<Script | null>(null);
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/data/oracle-script.json")
      .then((r) => r.json())
      .then((s) => {
        if (alive) setScript(s);
      });
    return () => {
      alive = false;
    };
  }, []);

  const currentLine = (() => {
    if (!script) return null;
    if (beat === "sandbox" || !(beat in script.beats)) return null;
    const lines = script.beats[beat as "b1" | "b2" | "b3" | "b4"];
    let active: ScriptLine | null = null;
    for (const l of lines) {
      if (beatT >= l.t) active = l;
    }
    return active;
  })();

  // fake-stream: when currentLine changes, type it out
  useEffect(() => {
    if (!currentLine) {
      setDisplayed("");
      return;
    }
    const target = currentLine.text;
    let i = 0;
    setDisplayed("");
    const id = window.setInterval(() => {
      i += 2;
      setDisplayed(target.slice(0, i));
      if (i >= target.length) window.clearInterval(id);
    }, 22);
    return () => window.clearInterval(id);
  }, [currentLine?.text]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!currentLine || beat === "sandbox") return null;

  return (
    <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-20 z-20 max-w-[720px] px-8 text-center">
      <p
        className="font-[family-name:var(--font-fraunces)] italic font-light text-[22px] md:text-[26px] leading-[1.35] text-[color:var(--nafas-surface)]"
        style={{ textShadow: "0 2px 24px rgba(0,0,0,0.8), 0 1px 4px rgba(0,0,0,0.9)" }}
      >
        {displayed}
        <span className="inline-block w-[3px] h-[0.9em] ml-0.5 align-middle bg-[color:var(--nafas-accent2)] animate-pulse" />
      </p>
    </div>
  );
}
