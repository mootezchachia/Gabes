export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-xl space-y-4">
        <div className="text-[11px] tracking-widest text-[color:var(--nafas-ink3)] font-mono uppercase">
          Nafas · v0 · chantier en cours
        </div>
        <h1 className="text-5xl leading-tight font-[family-name:var(--font-fraunces)]">
          La ville qui <em className="text-[color:var(--nafas-accent2)] font-light">respire</em> du phosphate.
        </h1>
        <p className="text-[color:var(--nafas-ink3)] leading-relaxed">
          Gabès, Tunisie — plateforme IA de surveillance et de remédiation.
        </p>
      </div>
    </main>
  );
}
