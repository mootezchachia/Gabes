export function LiveBadge() {
  return (
    <div className="hidden sm:flex items-center gap-2 text-[11px] font-[family-name:var(--font-jetbrains)] tracking-wider uppercase text-[color:var(--nafas-accent2)] px-3 py-1.5 rounded-full bg-[color:var(--nafas-accent)]/10 border border-[color:var(--nafas-accent)]/20">
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full rounded-full bg-[color:var(--nafas-accent2)] opacity-75 animate-ping" />
        <span className="relative inline-flex size-1.5 rounded-full bg-[color:var(--nafas-accent2)]" />
      </span>
      <span>Live · Gabès 33.88°N</span>
    </div>
  );
}
