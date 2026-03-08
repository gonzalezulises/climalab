import pptxgen from "pptxgenjs";

// ============================================================
// Palette — Teal Trust
// ============================================================
const C = {
  primary: "028090",    // dark teal (dark bg, titles)
  accent: "02C39A",     // green accent
  light: "F0FAFA",      // light bg
  text: "1A1A2E",       // main text
  textSec: "4A5568",    // secondary text
  white: "FFFFFF",
};

// Fonts
const HEADER_FONT = "Trebuchet MS";
const BODY_FONT = "Calibri";

// ============================================================
// Helpers
// ============================================================
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5

function darkSlide() {
  const s = pres.addSlide();
  s.background = { color: C.primary };
  return s;
}

function lightSlide() {
  const s = pres.addSlide();
  s.background = { color: C.light };
  return s;
}

// Accent bar on left side (portada + cierre)
function addAccentBar(slide) {
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: 0.3, h: 7.5,
    fill: { color: C.accent },
  });
}

// Logo placeholder
function addLogoPlaceholder(slide) {
  slide.addShape(pres.ShapeType.rect, {
    x: 11.63, y: 0.3, w: 1.2, h: 0.5,
    line: { color: C.accent, width: 1, dashType: "dash" },
  });
  slide.addText("[LOGO]", {
    x: 11.63, y: 0.3, w: 1.2, h: 0.5,
    fontSize: 10, fontFace: BODY_FONT,
    color: C.accent, align: "center", valign: "middle",
  });
}

// Section title for light slides
function addSectionTitle(slide, title, y) {
  const yPos = y || 0.4;
  slide.addText(title, {
    x: 0.8, y: yPos, w: 11.5, h: 0.7,
    fontSize: 28, fontFace: HEADER_FONT, bold: true,
    color: C.text,
  });
}

// ============================================================
// SLIDE 1 — Portada
// ============================================================
{
  const s = darkSlide();
  addAccentBar(s);
  addLogoPlaceholder(s);

  // Tagline top
  s.addText("INTELIGENCIA ORGANIZACIONAL", {
    x: 0.8, y: 0.5, w: 10, h: 0.4,
    fontSize: 12, fontFace: HEADER_FONT,
    color: C.white, bold: false,
    charSpacing: 4, transparency: 20,
  });

  // Main title
  s.addText(
    "Las organizaciones que crecen de manera sostenible toman decisiones sobre su gente con el mismo rigor con que toman decisiones financieras.",
    {
      x: 0.8, y: 1.5, w: 10.5, h: 3.2,
      fontSize: 36, fontFace: HEADER_FONT, bold: true,
      color: C.white, valign: "top",
      lineSpacingMultiple: 1.15,
    }
  );

  // Question
  s.addText("¿Tu organización ya lo hace?", {
    x: 0.8, y: 5.2, w: 10, h: 0.6,
    fontSize: 16, fontFace: BODY_FONT,
    color: C.accent,
  });
}

// ============================================================
// SLIDE 2 — El estándar
// ============================================================
{
  const s = lightSlide();
  addSectionTitle(s, "El nuevo estándar de las organizaciones de alto desempeño");

  const cards = [
    {
      icon: "📈",
      title: "Datos en tiempo real",
      desc: "Decisiones sobre personas respaldadas por evidencia actualizada, no por encuestas anuales que llegan tarde.",
    },
    {
      icon: "👥",
      title: "Comprensión profunda",
      desc: "Más allá de promedios: entender qué dimensiones impulsan el compromiso y dónde están los focos de riesgo.",
    },
    {
      icon: "🎯",
      title: "Acción informada",
      desc: "Convertir hallazgos en intervenciones concretas con criterio metodológico, no intuición.",
    },
  ];

  cards.forEach((card, i) => {
    const x = 0.8 + i * 4.0;
    const cardW = 3.5;
    const cardY = 1.8;

    // Card background
    s.addShape(pres.ShapeType.roundRect, {
      x, y: cardY, w: cardW, h: 4.2,
      fill: { color: C.white },
      shadow: { type: "outer", color: "000000", opacity: 0.1, blur: 6, offset: 2, angle: 45 },
      rectRadius: 0.15,
    });

    // Icon circle
    s.addShape(pres.ShapeType.ellipse, {
      x: x + cardW / 2 - 0.4, y: cardY + 0.4, w: 0.8, h: 0.8,
      fill: { color: C.primary },
    });

    // Icon text (emoji fallback since no react-icons in node)
    s.addText(card.icon, {
      x: x + cardW / 2 - 0.4, y: cardY + 0.4, w: 0.8, h: 0.8,
      fontSize: 22, align: "center", valign: "middle",
    });

    // Card title
    s.addText(card.title, {
      x: x + 0.3, y: cardY + 1.6, w: cardW - 0.6, h: 0.5,
      fontSize: 16, fontFace: HEADER_FONT, bold: true,
      color: C.text, align: "center",
    });

    // Card description
    s.addText(card.desc, {
      x: x + 0.3, y: cardY + 2.2, w: cardW - 0.6, h: 1.6,
      fontSize: 13, fontFace: BODY_FONT,
      color: C.textSec, align: "center",
      lineSpacingMultiple: 1.3,
    });
  });
}

// ============================================================
// SLIDE 3 — La brecha
// ============================================================
{
  const s = lightSlide();
  addSectionTitle(s, "La mayoría de las organizaciones opera con una brecha de información");

  const colY = 1.6;
  const colH = 5.0;
  const colW = 5.5;

  // Left column — current state (white bg, teal left border)
  s.addShape(pres.ShapeType.rect, {
    x: 0.8, y: colY, w: colW, h: colH,
    fill: { color: C.white },
    shadow: { type: "outer", color: "000000", opacity: 0.08, blur: 4, offset: 2, angle: 45 },
  });
  s.addShape(pres.ShapeType.rect, {
    x: 0.8, y: colY, w: 0.06, h: colH,
    fill: { color: C.primary },
  });

  s.addText("Lo que típicamente existe hoy", {
    x: 1.2, y: colY + 0.3, w: colW - 0.8, h: 0.5,
    fontSize: 16, fontFace: HEADER_FONT, bold: true,
    color: C.text,
  });

  const leftItems = [
    "Encuesta anual de clima con metodología genérica",
    "Resultados que llegan 6-8 semanas después del cierre",
    "Reporte PDF estático sin capacidad de exploración",
    "Sin forma de vincular clima con métricas de negocio",
    "Decisiones basadas en percepción, no en patrones",
  ];

  s.addText(
    leftItems.map((t) => ({
      text: t,
      options: { bullet: true, fontSize: 13, fontFace: BODY_FONT, color: C.textSec, lineSpacingMultiple: 1.6 },
    })),
    { x: 1.2, y: colY + 1.0, w: colW - 0.8, h: colH - 1.5 }
  );

  // Right column — what's possible (dark bg)
  const rx = 7.0;
  s.addShape(pres.ShapeType.rect, {
    x: rx, y: colY, w: colW, h: colH,
    fill: { color: C.primary },
    shadow: { type: "outer", color: "000000", opacity: 0.1, blur: 6, offset: 2, angle: 45 },
  });

  s.addText("Lo que es posible con el instrumento correcto", {
    x: rx + 0.4, y: colY + 0.3, w: colW - 0.8, h: 0.5,
    fontSize: 16, fontFace: HEADER_FONT, bold: true,
    color: C.white,
  });

  const rightItems = [
    "22 dimensiones validadas estadísticamente",
    "Resultados disponibles en tiempo real",
    "Dashboard interactivo con segmentación dinámica",
    "Análisis de redes que revela dinámicas invisibles",
    "IA que genera narrativas e identifica drivers",
  ];

  s.addText(
    rightItems.map((t) => ({
      text: t,
      options: {
        bullet: { code: "2713" }, // ✓
        fontSize: 13,
        fontFace: BODY_FONT,
        color: C.white,
        bulletColor: C.accent,
        lineSpacingMultiple: 1.6,
      },
    })),
    { x: rx + 0.4, y: colY + 1.0, w: colW - 0.8, h: colH - 1.5 }
  );
}

// ============================================================
// SLIDE 4 — La plataforma (dark)
// ============================================================
{
  const s = darkSlide();

  s.addText("Una plataforma diseñada para decisiones, no para reportes", {
    x: 0.8, y: 0.4, w: 11.5, h: 0.7,
    fontSize: 28, fontFace: HEADER_FONT, bold: true,
    color: C.white,
  });

  s.addText("Cuatro capacidades que trabajan juntas", {
    x: 0.8, y: 1.1, w: 11.5, h: 0.5,
    fontSize: 16, fontFace: BODY_FONT,
    color: C.accent,
  });

  const capabilities = [
    {
      icon: "📋",
      title: "Instrumento robusto",
      desc: "107 ítems en 22 dimensiones. Confiabilidad estadística verificada por dimensión. Módulos opcionales para contextos específicos.",
    },
    {
      icon: "🔗",
      title: "Análisis de redes organizacionales",
      desc: "Detecta cómo se distribuye la percepción entre grupos. Identifica comunidades de afinidad, puentes críticos y focos de fragmentación.",
    },
    {
      icon: "🤖",
      title: "Insights generados por IA",
      desc: "6 tipos de análisis cualitativos automáticos: narrativas, drivers, alertas, perfiles de segmento, tendencias y análisis de comentarios.",
    },
    {
      icon: "📊",
      title: "Exportación ejecutiva",
      desc: "DOCX con identidad visual de tu organización, Excel completo para análisis propio, y reporte de IA listo para presentar a directivos.",
    },
  ];

  const gridPositions = [
    { x: 0.8, y: 2.0 },
    { x: 6.9, y: 2.0 },
    { x: 0.8, y: 4.8 },
    { x: 6.9, y: 4.8 },
  ];

  capabilities.forEach((cap, i) => {
    const pos = gridPositions[i];
    const cardW = 5.6;
    const cardH = 2.3;

    // Card bg (semi-transparent white)
    s.addShape(pres.ShapeType.roundRect, {
      x: pos.x, y: pos.y, w: cardW, h: cardH,
      fill: { color: C.white, transparency: 88 },
      rectRadius: 0.1,
    });

    // Icon
    s.addText(cap.icon, {
      x: pos.x + 0.3, y: pos.y + 0.25, w: 0.6, h: 0.6,
      fontSize: 24, valign: "middle",
    });

    // Title
    s.addText(cap.title, {
      x: pos.x + 1.0, y: pos.y + 0.25, w: cardW - 1.4, h: 0.5,
      fontSize: 16, fontFace: HEADER_FONT, bold: true,
      color: C.white,
    });

    // Description
    s.addText(cap.desc, {
      x: pos.x + 0.3, y: pos.y + 0.95, w: cardW - 0.6, h: 1.2,
      fontSize: 12, fontFace: BODY_FONT,
      color: C.white, transparency: 15,
      lineSpacingMultiple: 1.3,
    });
  });
}

// ============================================================
// SLIDE 5 — Cómo funciona
// ============================================================
{
  const s = lightSlide();
  addSectionTitle(s, "Del lanzamiento a los resultados en días, no semanas");

  const steps = [
    { num: "1", title: "Configuración", desc: "Crea la organización, define departamentos e identidad visual. 30 minutos." },
    { num: "2", title: "Campaña", desc: "Selecciona instrumento y módulos. Agrega participantes por email o enlace anónimo." },
    { num: "3", title: "Aplicación", desc: "La encuesta corre en el navegador. Monitor en vivo cada 30 segundos." },
    { num: "4", title: "Cálculo", desc: "El motor estadístico procesa resultados al cerrar. ONA e insights de IA generados automáticamente." },
    { num: "5", title: "Decisión", desc: "11 vistas de resultados. Exporta DOCX ejecutivo o Excel completo para la reunión de directivos." },
  ];

  const stepW = 2.1;
  const gap = 0.35;
  const startX = 0.6;
  const stepY = 2.0;

  steps.forEach((step, i) => {
    const x = startX + i * (stepW + gap);

    // Number circle
    s.addShape(pres.ShapeType.ellipse, {
      x: x + stepW / 2 - 0.3, y: stepY, w: 0.6, h: 0.6,
      fill: { color: C.primary },
    });
    s.addText(step.num, {
      x: x + stepW / 2 - 0.3, y: stepY, w: 0.6, h: 0.6,
      fontSize: 18, fontFace: HEADER_FONT, bold: true,
      color: C.white, align: "center", valign: "middle",
    });

    // Title
    s.addText(step.title, {
      x, y: stepY + 0.8, w: stepW, h: 0.5,
      fontSize: 14, fontFace: HEADER_FONT, bold: true,
      color: C.text, align: "center",
    });

    // Description
    s.addText(step.desc, {
      x, y: stepY + 1.4, w: stepW, h: 2.2,
      fontSize: 11, fontFace: BODY_FONT,
      color: C.textSec, align: "center",
      lineSpacingMultiple: 1.3,
    });

    // Arrow connector (not after last step)
    if (i < steps.length - 1) {
      const arrowX = x + stepW + 0.02;
      s.addShape(pres.ShapeType.rightArrow, {
        x: arrowX, y: stepY + 0.15, w: 0.3, h: 0.3,
        fill: { color: C.accent },
      });
    }
  });
}

// ============================================================
// SLIDE 6 — Caso real
// ============================================================
{
  const s = lightSlide();

  // Disclaimer
  s.addText("Caso ilustrativo basado en aplicación real. Datos de referencia.", {
    x: 0.8, y: 0.3, w: 11, h: 0.3,
    fontSize: 10, fontFace: BODY_FONT, italic: true,
    color: C.textSec,
  });

  addSectionTitle(s, "Lo que reveló el análisis en una organización de servicios financieros", 0.6);

  // Stats row
  const stats = [
    { num: "350", label: "colaboradores medidos" },
    { num: "22", label: "dimensiones analizadas" },
    { num: "4", label: "clusters de percepción identificados" },
  ];

  stats.forEach((stat, i) => {
    const x = 0.8 + i * 4.0;
    const statW = 3.5;

    s.addShape(pres.ShapeType.roundRect, {
      x, y: 1.7, w: statW, h: 1.4,
      fill: { color: C.white },
      shadow: { type: "outer", color: "000000", opacity: 0.08, blur: 4, offset: 1, angle: 45 },
      rectRadius: 0.1,
    });

    s.addText(stat.num, {
      x, y: 1.8, w: statW, h: 0.8,
      fontSize: 42, fontFace: HEADER_FONT, bold: true,
      color: C.primary, align: "center", valign: "middle",
    });

    s.addText(stat.label, {
      x, y: 2.55, w: statW, h: 0.4,
      fontSize: 12, fontFace: BODY_FONT,
      color: C.textSec, align: "center",
    });
  });

  // Finding cards
  const findings = [
    {
      title: "Lo que el promedio ocultaba",
      text: "El índice global de clima era 3.8/5 — aparentemente aceptable. El análisis de redes reveló que dos departamentos operaban con percepciones radicalmente distintas al resto, con NMI de estabilidad de 0.87. La intervención se focalizó ahí.",
    },
    {
      title: "El driver que nadie había identificado",
      text: "La dimensión de Autonomía (AUT) tenía la correlación más alta con Engagement (r=0.71, p<0.01). No era liderazgo ni compensación — era la capacidad de tomar decisiones propias. Cambió el foco del plan de acción.",
    },
  ];

  findings.forEach((f, i) => {
    const fy = 3.5 + i * 1.9;
    const fw = 11.5;

    // Card with accent border
    s.addShape(pres.ShapeType.rect, {
      x: 0.8, y: fy, w: fw, h: 1.6,
      fill: { color: C.white },
      shadow: { type: "outer", color: "000000", opacity: 0.06, blur: 3, offset: 1, angle: 45 },
    });
    s.addShape(pres.ShapeType.rect, {
      x: 0.8, y: fy, w: 0.06, h: 1.6,
      fill: { color: C.accent },
    });

    s.addText(f.title, {
      x: 1.2, y: fy + 0.15, w: fw - 0.8, h: 0.4,
      fontSize: 14, fontFace: HEADER_FONT, bold: true,
      color: C.text,
    });

    s.addText(f.text, {
      x: 1.2, y: fy + 0.55, w: fw - 0.8, h: 0.9,
      fontSize: 12, fontFace: BODY_FONT,
      color: C.textSec,
      lineSpacingMultiple: 1.3,
    });
  });
}

// ============================================================
// SLIDE 7 — Modelo de servicio
// ============================================================
{
  const s = lightSlide();
  addSectionTitle(s, "Dos formas de trabajar según el nivel de acompañamiento que necesitas");

  const cardW = 5.5;
  const cardH = 4.6;
  const cardY = 1.6;

  // Card left — Self-service
  const lx = 0.8;
  s.addShape(pres.ShapeType.rect, {
    x: lx, y: cardY, w: cardW, h: cardH,
    fill: { color: C.white },
    shadow: { type: "outer", color: "000000", opacity: 0.1, blur: 6, offset: 2, angle: 45 },
  });
  // Top border
  s.addShape(pres.ShapeType.rect, {
    x: lx, y: cardY, w: cardW, h: 0.06,
    fill: { color: C.primary },
  });

  // Badge
  s.addText("PLATAFORMA", {
    x: lx + 0.3, y: cardY + 0.3, w: 1.8, h: 0.35,
    fontSize: 10, fontFace: BODY_FONT, bold: true,
    color: C.primary, align: "center", valign: "middle",
    shape: pres.ShapeType.roundRect,
    line: { color: C.primary, width: 1 },
    fill: { color: C.light },
    rectRadius: 0.05,
  });

  s.addText("Diagnóstico autogestionado", {
    x: lx + 0.3, y: cardY + 0.85, w: cardW - 0.6, h: 0.4,
    fontSize: 16, fontFace: HEADER_FONT, bold: true,
    color: C.text,
  });

  s.addText(
    "Acceso completo a la plataforma. Tu equipo configura, lanza y analiza. Ideal para organizaciones con capacidad interna de RRHH o People Analytics.",
    {
      x: lx + 0.3, y: cardY + 1.3, w: cardW - 0.6, h: 0.8,
      fontSize: 12, fontFace: BODY_FONT,
      color: C.textSec, lineSpacingMultiple: 1.3,
    }
  );

  const leftIncludes = [
    "Instrumento Core (107 ítems) o Pulso (22 ítems)",
    "Dashboard completo con 11 vistas",
    "Exportación DOCX y Excel",
    "Insights de IA automáticos",
  ];

  s.addText(
    leftIncludes.map((t) => ({
      text: t,
      options: { bullet: { code: "2713" }, fontSize: 12, fontFace: BODY_FONT, color: C.text, lineSpacingMultiple: 1.5 },
    })),
    { x: lx + 0.3, y: cardY + 2.3, w: cardW - 0.6, h: 2.0 }
  );

  // Card right — Consultancy
  const rx = 7.0;
  s.addShape(pres.ShapeType.rect, {
    x: rx, y: cardY, w: cardW, h: cardH,
    fill: { color: C.white },
    shadow: { type: "outer", color: "000000", opacity: 0.1, blur: 6, offset: 2, angle: 45 },
  });
  s.addShape(pres.ShapeType.rect, {
    x: rx, y: cardY, w: cardW, h: 0.06,
    fill: { color: C.accent },
  });

  // Badge dark
  s.addText("CONSULTORÍA + PLATAFORMA", {
    x: rx + 0.3, y: cardY + 0.3, w: 2.8, h: 0.35,
    fontSize: 10, fontFace: BODY_FONT, bold: true,
    color: C.white, align: "center", valign: "middle",
    shape: pres.ShapeType.roundRect,
    fill: { color: C.primary },
    rectRadius: 0.05,
  });

  s.addText("Diagnóstico con interpretación estratégica", {
    x: rx + 0.3, y: cardY + 0.85, w: cardW - 0.6, h: 0.4,
    fontSize: 16, fontFace: HEADER_FONT, bold: true,
    color: C.text,
  });

  s.addText(
    "Plataforma más sesiones de análisis, presentación ejecutiva y plan de acción. Para organizaciones que quieren convertir los datos en decisiones de forma inmediata.",
    {
      x: rx + 0.3, y: cardY + 1.3, w: cardW - 0.6, h: 0.8,
      fontSize: 12, fontFace: BODY_FONT,
      color: C.textSec, lineSpacingMultiple: 1.3,
    }
  );

  const rightIncludes = [
    "Todo lo de Plataforma",
    "Sesión de análisis de resultados",
    "Presentación al comité directivo",
    "Identificación de quick wins y plan de 90 días",
  ];

  s.addText(
    rightIncludes.map((t) => ({
      text: t,
      options: { bullet: { code: "2713" }, fontSize: 12, fontFace: BODY_FONT, color: C.text, lineSpacingMultiple: 1.5 },
    })),
    { x: rx + 0.3, y: cardY + 2.3, w: cardW - 0.6, h: 2.0 }
  );

  // Footnote
  s.addText(
    "[NOMBRE DE TU EMPRESA] puede orientarte sobre la modalidad más adecuada para el tamaño y madurez de tu organización.",
    {
      x: 0.8, y: 6.7, w: 11.5, h: 0.4,
      fontSize: 11, fontFace: BODY_FONT, italic: true,
      color: C.textSec,
    }
  );
}

// ============================================================
// SLIDE 8 — Cierre
// ============================================================
{
  const s = darkSlide();
  addAccentBar(s);
  addLogoPlaceholder(s);

  s.addText("El siguiente paso es simple", {
    x: 0.8, y: 1.2, w: 10, h: 0.8,
    fontSize: 38, fontFace: HEADER_FONT, bold: true,
    color: C.white,
  });

  s.addText("Una demo de 30 minutos es suficiente para ver el sistema con datos reales.", {
    x: 0.8, y: 2.1, w: 10, h: 0.6,
    fontSize: 20, fontFace: BODY_FONT,
    color: C.accent,
  });

  // Check bullets
  const checks = [
    "Sin compromiso de contratación",
    "Con datos reales de una organización similar a la tuya",
    "Con tiempo para preguntas específicas a tu contexto",
  ];

  checks.forEach((text, i) => {
    const cy = 3.2 + i * 0.55;

    s.addText("✓", {
      x: 0.8, y: cy, w: 0.4, h: 0.45,
      fontSize: 16, fontFace: BODY_FONT, bold: true,
      color: C.accent, align: "center", valign: "middle",
    });

    s.addText(text, {
      x: 1.3, y: cy, w: 9, h: 0.45,
      fontSize: 15, fontFace: BODY_FONT,
      color: C.white, valign: "middle",
    });
  });

  // CTA button
  s.addText("Agendemos la demo", {
    x: 4.0, y: 5.0, w: 5.0, h: 0.7,
    fontSize: 18, fontFace: HEADER_FONT, bold: true,
    color: C.white, align: "center", valign: "middle",
    shape: pres.ShapeType.roundRect,
    fill: { color: C.accent },
    rectRadius: 0.1,
  });

  // Contact placeholder
  s.addText("[email@tuempresa.com]  ·  [+000 0000-0000]", {
    x: 3.5, y: 5.9, w: 6, h: 0.4,
    fontSize: 12, fontFace: BODY_FONT,
    color: C.white, transparency: 30,
    align: "center",
  });
}

// ============================================================
// Save
// ============================================================
const outputPath = "/tmp/climalab-whitelabel-deck.pptx";
pres.writeFile({ fileName: outputPath }).then(() => {
  console.log(`Presentation saved to: ${outputPath}`);
});
