export function MissingTokenBanner() {
  return (
    <div className="absolute inset-0 z-20 grid place-items-center p-8">
      <div className="max-w-lg p-8 rounded-xl bg-[color:var(--nafas-bg2)]/80 backdrop-blur-xl border border-white/10 text-center">
        <div className="text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.2em] uppercase text-[color:var(--nafas-amber)] mb-4">
          Configuration requise
        </div>
        <h2 className="font-[family-name:var(--font-fraunces)] font-light text-2xl mb-3">
          Jeton Mapbox manquant
        </h2>
        <p className="text-[14px] text-[color:var(--nafas-ink3)] leading-[1.55] mb-5">
          Ajoute <code className="font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-accent2)]">NEXT_PUBLIC_MAPBOX_TOKEN</code> dans <code className="font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-accent2)]">.env.local</code>, puis redémarre le serveur.
        </p>
        <a
          href="https://console.mapbox.com/account/access-tokens/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex text-[13px] font-medium bg-[color:var(--nafas-accent)] hover:bg-[color:var(--nafas-accent2)] text-black px-5 py-2.5 rounded-md transition-colors"
        >
          Obtenir un jeton gratuit →
        </a>
      </div>
    </div>
  );
}
