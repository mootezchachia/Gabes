export default function SimulatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 overflow-hidden bg-[color:var(--nafas-bg)]">
      {children}
    </div>
  );
}
