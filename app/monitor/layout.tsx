export default function MonitorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 overflow-hidden bg-[color:var(--nafas-bg)] text-[color:var(--nafas-surface)]">
      {children}
    </div>
  );
}
