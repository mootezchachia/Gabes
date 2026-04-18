"use client";

import { useState } from "react";
import { Button } from "@/components/app/ui/Primitives";

/**
 * Minimal PDF export using @react-pdf/renderer. We lazy-load both the pdf
 * generator AND the Supabase payload so the initial Analytique bundle stays
 * slim. The document intentionally keeps typography restrained — NAFAS
 * tone, not corporate-report cliché.
 */
export function PdfExportButton() {
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      const [{ pdf, Document, Page, View, Text, StyleSheet, Font }, { createSupabaseBrowserClient }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/lib/supabase/client"),
      ]);

      // Base fonts: keep it simple — rely on PDF built-ins (Helvetica).
      void Font;

      const supabase = createSupabaseBrowserClient();
      const [{ data: panels }, { data: placements }, { data: forecasts }] = await Promise.all([
        supabase.from("algae_panels").select("status, area_m2"),
        supabase.from("ai_placements").select("strategy, status, score, created_at").limit(50),
        supabase.from("ai_forecasts").select("target_kind, horizon_years, created_at").limit(50),
      ]);

      const styles = StyleSheet.create({
        page: { backgroundColor: "#0A0F14", color: "#F7F6F2", padding: 36, fontSize: 10 },
        eyebrow: { color: "#3EC99A", fontSize: 8, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 },
        h1: { fontSize: 28, marginBottom: 12 },
        section: { marginTop: 18 },
        row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
        label: { color: "#9A998F" },
        kbd: { fontSize: 9, color: "#9A998F" },
      });

      const activePanels = (panels ?? []).filter((p) => p.status === "active").length;
      const totalArea = (panels ?? []).reduce((s, p) => s + (p.area_m2 ?? 0), 0);

      const doc = (
        <Document>
          <Page size="A4" style={styles.page}>
            <Text style={styles.eyebrow}>NAFAS · Rapport · Analytique</Text>
            <Text style={styles.h1}>Plateforme NAFAS — instantané</Text>
            <Text style={styles.kbd}>Généré le {new Date().toLocaleString("fr-FR")}</Text>

            <View style={styles.section}>
              <Text style={styles.eyebrow}>Panneaux</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Actifs</Text>
                <Text>{activePanels}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Surface cumulée (m²)</Text>
                <Text>{totalArea.toLocaleString("fr-FR")}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.eyebrow}>Scans ORACLE récents</Text>
              {(placements ?? []).slice(0, 10).map((p, i) => (
                <View style={styles.row} key={i}>
                  <Text style={styles.label}>
                    {new Date(p.created_at).toLocaleDateString("fr-FR")} · {p.strategy}
                  </Text>
                  <Text>
                    {p.status} · {Number(p.score).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.eyebrow}>Prévisions</Text>
              {(forecasts ?? []).slice(0, 10).map((f, i) => (
                <View style={styles.row} key={i}>
                  <Text style={styles.label}>
                    {new Date(f.created_at).toLocaleDateString("fr-FR")} · {f.target_kind}
                  </Text>
                  <Text>horizon {f.horizon_years}a</Text>
                </View>
              ))}
            </View>
          </Page>
        </Document>
      );

      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nafas-rapport-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="secondary" onClick={onClick} disabled={busy}>
      {busy ? "Export…" : "Exporter PDF"}
    </Button>
  );
}
