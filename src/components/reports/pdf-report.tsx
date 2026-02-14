import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { CATEGORY_LABELS } from "@/lib/constants";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10 },
  cover: { flex: 1, justifyContent: "center", alignItems: "center" },
  coverTitle: { fontSize: 20, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 16 },
  coverSubtitle: { fontSize: 14, color: "#555", textAlign: "center", marginBottom: 8 },
  coverDate: { fontSize: 11, color: "#888", textAlign: "center", marginTop: 24 },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    marginTop: 20,
    color: "#1e3a5f",
  },
  subsectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 4, marginTop: 12 },
  text: { fontSize: 10, lineHeight: 1.5, marginBottom: 4 },
  // KPIs
  kpiRow: { flexDirection: "row", marginBottom: 12, gap: 12 },
  kpiBox: { flex: 1, border: "1 solid #ddd", borderRadius: 4, padding: 10, alignItems: "center" },
  kpiValue: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#1e3a5f" },
  kpiLabel: { fontSize: 8, color: "#888", marginTop: 2 },
  // Tables
  table: { marginBottom: 12 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderBottom: "1 solid #cbd5e1",
    paddingVertical: 4,
  },
  tableRow: { flexDirection: "row", borderBottom: "0.5 solid #e2e8f0", paddingVertical: 3 },
  cell: { fontSize: 9, paddingHorizontal: 4 },
  cellBold: { fontSize: 9, fontFamily: "Helvetica-Bold", paddingHorizontal: 4 },
  // Alert
  alertRow: { flexDirection: "row", borderBottom: "0.5 solid #e2e8f0", paddingVertical: 3 },
  sevBadge: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "white",
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 2,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 7,
    color: "#aaa",
    textAlign: "center",
  },
});

type PdfReportProps = {
  campaignName: string;
  organizationName: string;
  // KPIs
  engagement: number;
  favorability: number;
  enps: number;
  responseRate: number;
  sampleN: number;
  populationN: number;
  marginOfError: number;
  // Data
  categories: Array<{ category: string; avg_score: number; favorability_pct: number }>;
  dimensions: Array<{ code: string; name: string; avg: number; fav: number; rwg: number | null }>;
  departmentRanking: Array<{ department: string; avgScore: number; avgFav: number; n: number }>;
  alerts: Array<{ severity: string; message: string; value: number; threshold: number }>;
  drivers: Array<{ code: string; name: string; r: number }>;
  reliability: Array<{
    dimension_code: string;
    dimension_name: string;
    alpha: number | null;
    item_count: number;
    respondent_count: number;
  }>;
  // AI
  narrative: {
    executive_summary: string;
    highlights: string[];
    concerns: string[];
    recommendation: string;
  } | null;
  commentSummary: { strengths: string; improvements: string; general: string } | null;
};

export function PdfReport({
  campaignName,
  organizationName,
  engagement,
  favorability,
  enps,
  responseRate,
  sampleN,
  populationN,
  marginOfError,
  categories,
  dimensions,
  departmentRanking,
  alerts,
  drivers,
  reliability,
  narrative,
  commentSummary,
}: PdfReportProps) {
  const date = new Date().toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document>
      {/* Cover */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.cover}>
          <Text style={styles.coverTitle}>REPORTE EJECUTIVO{"\n"}DE CLIMA ORGANIZACIONAL</Text>
          <Text style={styles.coverSubtitle}>{campaignName}</Text>
          <Text style={styles.coverSubtitle}>{organizationName}</Text>
          <Text style={styles.coverDate}>{date}</Text>
        </View>
        <Text style={styles.footer}>Generado por ClimaLab</Text>
      </Page>

      {/* Content pages */}
      <Page size="LETTER" style={styles.page}>
        {/* Executive summary */}
        {narrative && (
          <>
            <Text style={styles.sectionTitle}>1. Resumen Ejecutivo</Text>
            <Text style={styles.text}>{narrative.executive_summary}</Text>
            {narrative.highlights.length > 0 && (
              <>
                <Text style={styles.subsectionTitle}>Destacados</Text>
                {narrative.highlights.map((h, i) => (
                  <Text key={i} style={styles.text}>
                    + {h}
                  </Text>
                ))}
              </>
            )}
            {narrative.concerns.length > 0 && (
              <>
                <Text style={styles.subsectionTitle}>Preocupaciones</Text>
                {narrative.concerns.map((c, i) => (
                  <Text key={i} style={styles.text}>
                    ! {c}
                  </Text>
                ))}
              </>
            )}
            <Text style={styles.subsectionTitle}>Recomendacion</Text>
            <Text style={styles.text}>{narrative.recommendation}</Text>
          </>
        )}

        {/* KPIs */}
        <Text style={styles.sectionTitle}>2. Indicadores Clave</Text>
        <View style={styles.kpiRow}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiValue}>{engagement.toFixed(2)}</Text>
            <Text style={styles.kpiLabel}>Engagement (de 5.0)</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiValue}>{favorability}%</Text>
            <Text style={styles.kpiLabel}>Favorabilidad</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiValue}>{enps}</Text>
            <Text style={styles.kpiLabel}>eNPS</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiValue}>{responseRate}%</Text>
            <Text style={styles.kpiLabel}>Tasa de respuesta</Text>
          </View>
        </View>

        {/* Categories */}
        <Text style={styles.sectionTitle}>3. Scores por Categoria</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.cellBold, { width: "40%" }]}>Categoria</Text>
            <Text style={[styles.cellBold, { width: "30%" }]}>Score</Text>
            <Text style={[styles.cellBold, { width: "30%" }]}>Favorabilidad</Text>
          </View>
          {categories.map((c) => (
            <View key={c.category} style={styles.tableRow}>
              <Text style={[styles.cell, { width: "40%" }]}>
                {CATEGORY_LABELS[c.category] ?? c.category}
              </Text>
              <Text style={[styles.cell, { width: "30%" }]}>{c.avg_score.toFixed(2)}</Text>
              <Text style={[styles.cell, { width: "30%" }]}>{c.favorability_pct}%</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>Generado por ClimaLab</Text>
      </Page>

      {/* Dimension ranking + departments */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.sectionTitle}>4. Ranking de Dimensiones</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.cellBold, { width: "10%" }]}>Cod</Text>
            <Text style={[styles.cellBold, { width: "35%" }]}>Dimension</Text>
            <Text style={[styles.cellBold, { width: "15%" }]}>Score</Text>
            <Text style={[styles.cellBold, { width: "15%" }]}>Fav %</Text>
            <Text style={[styles.cellBold, { width: "15%" }]}>rwg</Text>
          </View>
          {dimensions.map((d) => (
            <View key={d.code} style={styles.tableRow}>
              <Text style={[styles.cell, { width: "10%" }]}>{d.code}</Text>
              <Text style={[styles.cell, { width: "35%" }]}>{d.name}</Text>
              <Text style={[styles.cell, { width: "15%" }]}>{d.avg.toFixed(2)}</Text>
              <Text style={[styles.cell, { width: "15%" }]}>{d.fav}%</Text>
              <Text style={[styles.cell, { width: "15%" }]}>
                {d.rwg != null ? d.rwg.toFixed(3) : "-"}
              </Text>
            </View>
          ))}
        </View>

        {/* Department ranking */}
        {departmentRanking.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>5. Resumen por Departamento</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.cellBold, { width: "40%" }]}>Departamento</Text>
                <Text style={[styles.cellBold, { width: "20%" }]}>Score</Text>
                <Text style={[styles.cellBold, { width: "20%" }]}>Fav %</Text>
                <Text style={[styles.cellBold, { width: "20%" }]}>n</Text>
              </View>
              {departmentRanking.map((d) => (
                <View key={d.department} style={styles.tableRow}>
                  <Text style={[styles.cell, { width: "40%" }]}>{d.department}</Text>
                  <Text style={[styles.cell, { width: "20%" }]}>{d.avgScore.toFixed(2)}</Text>
                  <Text style={[styles.cell, { width: "20%" }]}>{d.avgFav}%</Text>
                  <Text style={[styles.cell, { width: "20%" }]}>{d.n}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.footer}>Generado por ClimaLab</Text>
      </Page>

      {/* Alerts + Drivers + Comments + Technical */}
      <Page size="LETTER" style={styles.page}>
        {/* Alerts */}
        {alerts.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>6. Alertas Principales</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.cellBold, { width: "15%" }]}>Severidad</Text>
                <Text style={[styles.cellBold, { width: "55%" }]}>Mensaje</Text>
                <Text style={[styles.cellBold, { width: "15%" }]}>Valor</Text>
                <Text style={[styles.cellBold, { width: "15%" }]}>Umbral</Text>
              </View>
              {alerts.slice(0, 15).map((a, i) => (
                <View key={i} style={styles.alertRow}>
                  <Text style={[styles.cell, { width: "15%" }]}>{a.severity}</Text>
                  <Text style={[styles.cell, { width: "55%" }]}>{a.message}</Text>
                  <Text style={[styles.cell, { width: "15%" }]}>
                    {typeof a.value === "number" ? a.value.toFixed(1) : a.value}
                  </Text>
                  <Text style={[styles.cell, { width: "15%" }]}>{a.threshold}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Drivers */}
        {drivers.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>7. Top Drivers de Engagement</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.cellBold, { width: "15%" }]}>Codigo</Text>
                <Text style={[styles.cellBold, { width: "55%" }]}>Dimension</Text>
                <Text style={[styles.cellBold, { width: "30%" }]}>r (correlacion)</Text>
              </View>
              {drivers.slice(0, 10).map((d) => (
                <View key={d.code} style={styles.tableRow}>
                  <Text style={[styles.cell, { width: "15%" }]}>{d.code}</Text>
                  <Text style={[styles.cell, { width: "55%" }]}>{d.name}</Text>
                  <Text style={[styles.cell, { width: "30%" }]}>{d.r.toFixed(3)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Comment summary */}
        {commentSummary && (
          <>
            <Text style={styles.sectionTitle}>8. Resumen de Comentarios</Text>
            <Text style={styles.subsectionTitle}>Fortalezas</Text>
            <Text style={styles.text}>{commentSummary.strengths}</Text>
            <Text style={styles.subsectionTitle}>Areas de mejora</Text>
            <Text style={styles.text}>{commentSummary.improvements}</Text>
            {commentSummary.general && (
              <>
                <Text style={styles.subsectionTitle}>General</Text>
                <Text style={styles.text}>{commentSummary.general}</Text>
              </>
            )}
          </>
        )}

        <Text style={styles.footer}>Generado por ClimaLab</Text>
      </Page>

      {/* Technical sheet */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.sectionTitle}>9. Ficha Tecnica</Text>
        <View style={styles.kpiRow}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiValue}>{populationN}</Text>
            <Text style={styles.kpiLabel}>Poblacion (N)</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiValue}>{sampleN}</Text>
            <Text style={styles.kpiLabel}>Muestra (n)</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiValue}>{responseRate}%</Text>
            <Text style={styles.kpiLabel}>Tasa de respuesta</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiValue}>+/-{marginOfError}%</Text>
            <Text style={styles.kpiLabel}>Margen de error</Text>
          </View>
        </View>

        {reliability.length > 0 && (
          <>
            <Text style={styles.subsectionTitle}>Confiabilidad (Cronbach alfa)</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.cellBold, { width: "10%" }]}>Cod</Text>
                <Text style={[styles.cellBold, { width: "40%" }]}>Dimension</Text>
                <Text style={[styles.cellBold, { width: "20%" }]}>alfa</Text>
                <Text style={[styles.cellBold, { width: "15%" }]}>Items</Text>
                <Text style={[styles.cellBold, { width: "15%" }]}>n</Text>
              </View>
              {reliability.map((r) => (
                <View key={r.dimension_code} style={styles.tableRow}>
                  <Text style={[styles.cell, { width: "10%" }]}>{r.dimension_code}</Text>
                  <Text style={[styles.cell, { width: "40%" }]}>{r.dimension_name}</Text>
                  <Text style={[styles.cell, { width: "20%" }]}>
                    {r.alpha != null ? r.alpha.toFixed(3) : "N/A"}
                  </Text>
                  <Text style={[styles.cell, { width: "15%" }]}>{r.item_count}</Text>
                  <Text style={[styles.cell, { width: "15%" }]}>{r.respondent_count}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.footer}>Generado por ClimaLab</Text>
      </Page>
    </Document>
  );
}
