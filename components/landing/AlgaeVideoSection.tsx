export function AlgaeVideoSection() {
  return (
    <section className="relative h-screen overflow-hidden">
      <video
        autoPlay
        muted
        playsInline
        loop
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/videos/algae-scrub.mp4" type="video/mp4" />
      </video>

      {/* overlay */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(6,10,14,0.62) 0%, rgba(6,10,14,0.32) 40%, rgba(6,10,14,0.72) 100%)",
        }}
      />

      {/* label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 z-10 pointer-events-none">
        <div
          className="text-[10px] font-[family-name:var(--font-jetbrains)] tracking-[0.28em] uppercase mb-4"
          style={{ color: "rgba(140,195,120,0.7)" }}
        >
          HealiX · Phycoremédiation
        </div>
        <h2
          className="font-[family-name:var(--font-fraunces)] font-normal tracking-[-0.02em] leading-[1.0] text-[clamp(28px,4.5vw,56px)] mb-3"
          style={{ color: "#EEE8DC" }}
        >
          Du toxique au filtre vivant.
        </h2>
        <p
          className="text-[14.5px] leading-[1.6] max-w-[44ch]"
          style={{ color: "rgba(160,155,145,0.85)" }}
        >
          Ulva lactuca et Posidonia oceanica transplantées dans le Golfe — 225 kg de phosphore
          retirés par an.
        </p>
      </div>
    </section>
  );
}
