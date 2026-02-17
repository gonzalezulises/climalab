import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { CATEGORY_LABELS, DEFAULT_BRAND_CONFIG } from "@/lib/constants";
import type { BrandConfig } from "@/types";

function createStyles(primaryColor: string) {
  return StyleSheet.create({
    page: { padding: 40, fontFamily: "Helvetica", fontSize: 10 },
    cover: { flex: 1, justifyContent: "center", alignItems: "center" },
    coverTitle: {
      fontSize: 20,
      fontFamily: "Helvetica-Bold",
      textAlign: "center",
      marginBottom: 16,
    },
    coverSubtitle: { fontSize: 14, color: "#555", textAlign: "center", marginBottom: 8 },
    coverDate: { fontSize: 11, color: "#888", textAlign: "center", marginTop: 24 },
    sectionTitle: {
      fontSize: 14,
      fontFamily: "Helvetica-Bold",
      marginBottom: 8,
      marginTop: 20,
      color: primaryColor,
    },
    subsectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 4, marginTop: 12 },
    text: { fontSize: 10, lineHeight: 1.5, marginBottom: 4 },
    // KPIs
    kpiRow: { flexDirection: "row", marginBottom: 12, gap: 12 },
    kpiBox: { flex: 1, border: "1 solid #ddd", borderRadius: 4, padding: 10, alignItems: "center" },
    kpiValue: { fontSize: 18, fontFamily: "Helvetica-Bold", color: primaryColor },
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
    coverLogo: {
      maxHeight: 60,
      maxWidth: 200,
      marginBottom: 16,
    },
  });
}

type PdfReportProps = {
  campaignName: string;
  organizationName: string;
  // Branding
  logoUrl?: string | null;
  brandConfig?: Partial<BrandConfig>;
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
  // Business indicators
  businessIndicators?: Array<{
    indicator_name: string;
    indicator_value: number;
    indicator_unit: string | null;
  }>;
  // ONA summary
  onaSummary?: {
    communities: number;
    modularity: number;
    topDiscriminants: string[];
    narrative: string;
  } | null;
  // AI
  narrative: {
    executive_summary: string;
    highlights: string[];
    concerns: string[];
    recommendation: string;
  } | null;
  commentSummary: { strengths: string; improvements: string; general: string } | null;
  driverInsights?: {
    narrative: string;
    paradoxes: string[];
    quick_wins: Array<{ dimension: string; action: string; impact: string }>;
  } | null;
  alertContext?: Array<{
    alert_index: number;
    root_cause: string;
    recommendation: string;
  }> | null;
  segmentProfiles?: Array<{
    segment: string;
    segment_type: string;
    narrative: string;
    strengths: string[];
    risks: string[];
  }> | null;
  trendsNarrative?: {
    trajectory: string;
    improving: string[];
    declining: string[];
    stable: string[];
    inflection_points: string[];
  } | null;
};

export function PdfReport({
  campaignName,
  organizationName,
  logoUrl,
  brandConfig,
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
  businessIndicators,
  onaSummary,
  narrative,
  commentSummary,
  driverInsights,
  alertContext,
  segmentProfiles,
  trendsNarrative,
}: PdfReportProps) {
  const brand = { ...DEFAULT_BRAND_CONFIG, ...brandConfig };
  const styles = createStyles(brand.primary_color);

  const date = new Date().toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const footerText = brand.show_powered_by
    ? "Generado por ClimaLab"
    : `Generado para ${organizationName}`;

  return (
    <Document>
      {/* Cover */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.cover}>
          {logoUrl && <Image src={logoUrl} style={styles.coverLogo} />}
          <Text style={styles.coverTitle}>REPORTE EJECUTIVO{"\n"}DE CLIMA ORGANIZACIONAL</Text>
          <Text style={styles.coverSubtitle}>{campaignName}</Text>
          <Text style={styles.coverSubtitle}>{organizationName}</Text>
          <Text style={styles.coverDate}>{date}</Text>
        </View>
        <Text style={styles.footer}>{footerText}</Text>
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

        <Text style={styles.footer}>{footerText}</Text>
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

        <Text style={styles.footer}>{footerText}</Text>
      </Page>

      {/* Alerts + Drivers */}
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
              {alerts.slice(0, 15).map((a, i) => {
                const ctx = alertContext?.find((c) => c.alert_index === i);
                return (
                  <View key={i} wrap={false}>
                    <View style={styles.alertRow}>
                      <Text style={[styles.cell, { width: "15%" }]}>{a.severity}</Text>
                      <Text style={[styles.cell, { width: "55%" }]}>{a.message}</Text>
                      <Text style={[styles.cell, { width: "15%" }]}>
                        {typeof a.value === "number" ? a.value.toFixed(1) : a.value}
                      </Text>
                      <Text style={[styles.cell, { width: "15%" }]}>{a.threshold}</Text>
                    </View>
                    {ctx && (
                      <View style={{ paddingLeft: 20, paddingBottom: 4 }}>
                        <Text style={{ fontSize: 8, color: "#7c3aed" }}>
                          Causa probable: {ctx.root_cause}
                        </Text>
                        <Text style={{ fontSize: 8, color: "#2563eb" }}>
                          Recomendacion: {ctx.recommendation}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
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
            {driverInsights && (
              <>
                <Text style={styles.subsectionTitle}>Interpretacion IA</Text>
                <Text style={styles.text}>{driverInsights.narrative}</Text>
                {driverInsights.quick_wins.length > 0 && (
                  <>
                    <Text style={styles.subsectionTitle}>Quick Wins</Text>
                    {driverInsights.quick_wins.map((qw, i) => (
                      <Text key={i} style={styles.text}>
                        - {qw.dimension}: {qw.action} (Impacto: {qw.impact})
                      </Text>
                    ))}
                  </>
                )}
                {driverInsights.paradoxes.length > 0 && (
                  <>
                    <Text style={styles.subsectionTitle}>Paradojas detectadas</Text>
                    {driverInsights.paradoxes.map((p, i) => (
                      <Text key={i} style={styles.text}>
                        ? {p}
                      </Text>
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}

        <Text style={styles.footer}>{footerText}</Text>
      </Page>

      {/* Comments + Segments + Trends */}
      <Page size="LETTER" style={styles.page}>
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

        {/* Segment profiles */}
        {segmentProfiles && segmentProfiles.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>9. Perfiles de Segmento</Text>
            {segmentProfiles.map((p, i) => (
              <View key={i} wrap={false} style={{ marginBottom: 8 }}>
                <Text style={styles.subsectionTitle}>
                  {p.segment} ({p.segment_type})
                </Text>
                <Text style={styles.text}>{p.narrative}</Text>
                {p.strengths.length > 0 && (
                  <Text style={styles.text}>Fortalezas: {p.strengths.join(", ")}</Text>
                )}
                {p.risks.length > 0 && (
                  <Text style={styles.text}>Riesgos: {p.risks.join(", ")}</Text>
                )}
              </View>
            ))}
          </>
        )}

        {/* Trends narrative */}
        {trendsNarrative && (
          <>
            <Text style={styles.sectionTitle}>10. Analisis de Tendencias</Text>
            <Text style={styles.text}>{trendsNarrative.trajectory}</Text>
            {trendsNarrative.improving.length > 0 && (
              <>
                <Text style={styles.subsectionTitle}>Mejorando</Text>
                {trendsNarrative.improving.map((item, i) => (
                  <Text key={i} style={styles.text}>
                    + {item}
                  </Text>
                ))}
              </>
            )}
            {trendsNarrative.declining.length > 0 && (
              <>
                <Text style={styles.subsectionTitle}>En declive</Text>
                {trendsNarrative.declining.map((item, i) => (
                  <Text key={i} style={styles.text}>
                    - {item}
                  </Text>
                ))}
              </>
            )}
            {trendsNarrative.inflection_points.length > 0 && (
              <>
                <Text style={styles.subsectionTitle}>Puntos de inflexion</Text>
                {trendsNarrative.inflection_points.map((item, i) => (
                  <Text key={i} style={styles.text}>
                    {item}
                  </Text>
                ))}
              </>
            )}
          </>
        )}

        <Text style={styles.footer}>{footerText}</Text>
      </Page>

      {/* Business indicators + ONA */}
      <Page size="LETTER" style={styles.page}>
        {/* Business indicators */}
        {businessIndicators && businessIndicators.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>11. Indicadores de Negocio</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.cellBold, { width: "50%" }]}>Indicador</Text>
                <Text style={[styles.cellBold, { width: "25%" }]}>Valor</Text>
                <Text style={[styles.cellBold, { width: "25%" }]}>Unidad</Text>
              </View>
              {businessIndicators.map((bi, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.cell, { width: "50%" }]}>{bi.indicator_name}</Text>
                  <Text style={[styles.cell, { width: "25%" }]}>{bi.indicator_value}</Text>
                  <Text style={[styles.cell, { width: "25%" }]}>{bi.indicator_unit ?? "-"}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ONA summary */}
        {onaSummary && (
          <>
            <Text style={styles.sectionTitle}>12. Red Perceptual (ONA)</Text>
            <View style={styles.kpiRow}>
              <View style={styles.kpiBox}>
                <Text style={styles.kpiValue}>{onaSummary.communities}</Text>
                <Text style={styles.kpiLabel}>Comunidades</Text>
              </View>
              <View style={styles.kpiBox}>
                <Text style={styles.kpiValue}>{onaSummary.modularity.toFixed(3)}</Text>
                <Text style={styles.kpiLabel}>Modularidad</Text>
              </View>
            </View>
            {onaSummary.topDiscriminants.length > 0 && (
              <Text style={styles.text}>
                Dimensiones discriminantes: {onaSummary.topDiscriminants.join(", ")}
              </Text>
            )}
            <Text style={styles.text}>{onaSummary.narrative}</Text>
          </>
        )}

        <Text style={styles.footer}>{footerText}</Text>
      </Page>

      {/* Technical sheet */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.sectionTitle}>13. Ficha Tecnica</Text>
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

        <Text style={styles.footer}>{footerText}</Text>
      </Page>
    </Document>
  );
}
