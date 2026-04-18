export const metadata = {
  title: "NAFAS · Gabès 3D — moniteur atmosphérique volumétrique",
};

export default function Monitor3DLayout({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 overflow-hidden bg-[color:var(--nafas-bg)]">{children}</div>;
}
