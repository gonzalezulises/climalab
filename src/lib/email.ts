import { Resend } from "resend";
import { env } from "@/lib/env";
import { DEFAULT_BRAND_CONFIG } from "@/lib/constants";
import type { BrandConfig } from "@/types";

function getResend() {
  const key = env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY no configurado");
  return new Resend(key);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EmailType = "invitation" | "reminder" | "campaign_closed" | "results_ready";

export type BrandedEmailParams = {
  to: string;
  type: EmailType;
  participantName: string;
  organizationName: string;
  campaignName: string;
  surveyUrl?: string;
  resultsUrl?: string;
  daysRemaining?: number;
  logoUrl?: string | null;
  brandConfig?: Partial<BrandConfig>;
};

// ---------------------------------------------------------------------------
// sendBrandedEmail — unified multi-type branded email sender
// ---------------------------------------------------------------------------
export async function sendBrandedEmail(params: BrandedEmailParams) {
  const fromEmail = env.RESEND_FROM_EMAIL || "ClimaLab <noreply@climalab.app>";
  const brand = { ...DEFAULT_BRAND_CONFIG, ...params.brandConfig };

  const { subject, html } = buildEmailContent(params, brand);

  const { data, error } = await getResend().emails.send({
    from: fromEmail,
    to: params.to,
    subject,
    html,
  });

  if (error) {
    return { success: false as const, error: error.message };
  }

  return { success: true as const, messageId: data?.id };
}

// ---------------------------------------------------------------------------
// Legacy wrapper — backwards compatibility
// ---------------------------------------------------------------------------
type SendInvitationParams = {
  to: string;
  participantName: string;
  organizationName: string;
  campaignName: string;
  surveyUrl: string;
  logoUrl?: string | null;
  brandConfig?: Partial<BrandConfig>;
};

export async function sendSurveyInvitation(params: SendInvitationParams) {
  return sendBrandedEmail({
    ...params,
    type: "invitation",
  });
}

// ---------------------------------------------------------------------------
// Build email content by type
// ---------------------------------------------------------------------------
function buildEmailContent(
  params: BrandedEmailParams,
  brand: BrandConfig
): { subject: string; html: string } {
  const { type, participantName, organizationName, campaignName, surveyUrl, daysRemaining } =
    params;

  let subject: string;
  let bodyHtml: string;

  switch (type) {
    case "invitation":
      subject = `${organizationName} te invita a participar en la encuesta de clima`;
      bodyHtml = `
        <p style="color:#18181b;font-size:16px;margin:0 0 24px">
          Hola <strong>${participantName}</strong>,
        </p>
        <p style="color:#3f3f46;font-size:15px;line-height:1.6;margin:0 0 16px">
          <strong>${organizationName}</strong> te invita a participar en la encuesta
          de clima organizacional <strong>&ldquo;${campaignName}&rdquo;</strong>.
        </p>
        <p style="color:#3f3f46;font-size:15px;line-height:1.6;margin:0 0 24px">
          Tu participación es <strong>completamente anónima</strong>.
          Las respuestas individuales no serán compartidas con tu organización &mdash;
          solo se reportan resultados agregados.
        </p>
        ${ctaButton(surveyUrl!, "Responder encuesta", brand.accent_color)}
        ${urlFallback(surveyUrl!)}
        <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0">
        <p style="color:#a1a1aa;font-size:12px;line-height:1.5;margin:0">
          Este enlace es único y personal. No lo compartas con otras personas.
          La encuesta toma aproximadamente 10 minutos.
        </p>`;
      break;

    case "reminder":
      subject = `Recordatorio: tu opinión es importante — ${campaignName}`;
      bodyHtml = `
        <p style="color:#18181b;font-size:16px;margin:0 0 24px">
          Hola <strong>${participantName}</strong>,
        </p>
        <p style="color:#3f3f46;font-size:15px;line-height:1.6;margin:0 0 16px">
          Queremos recordarte que la encuesta de clima organizacional
          <strong>&ldquo;${campaignName}&rdquo;</strong> de <strong>${organizationName}</strong>
          aún está abierta${daysRemaining ? ` y cierra en ${daysRemaining} día${daysRemaining !== 1 ? "s" : ""}` : ""}.
        </p>
        <p style="color:#3f3f46;font-size:15px;line-height:1.6;margin:0 0 24px">
          Tu participación es <strong>completamente anónima</strong> y toma aproximadamente 10 minutos.
        </p>
        ${ctaButton(surveyUrl!, "Completar encuesta", brand.accent_color)}
        ${urlFallback(surveyUrl!)}`;
      break;

    case "campaign_closed":
      subject = `Encuesta "${campaignName}" finalizada — gracias por participar`;
      bodyHtml = `
        <p style="color:#18181b;font-size:16px;margin:0 0 24px">
          Hola <strong>${participantName}</strong>,
        </p>
        <p style="color:#3f3f46;font-size:15px;line-height:1.6;margin:0 0 24px">
          La encuesta de clima organizacional <strong>&ldquo;${campaignName}&rdquo;</strong>
          de <strong>${organizationName}</strong> ha sido cerrada.
          Gracias a quienes participaron — sus respuestas contribuyen a mejorar el ambiente de trabajo.
        </p>`;
      break;

    case "results_ready":
      subject = `Resultados disponibles: ${campaignName}`;
      bodyHtml = `
        <p style="color:#18181b;font-size:16px;margin:0 0 24px">
          Hola <strong>${participantName}</strong>,
        </p>
        <p style="color:#3f3f46;font-size:15px;line-height:1.6;margin:0 0 24px">
          Los resultados de la encuesta <strong>&ldquo;${campaignName}&rdquo;</strong>
          de <strong>${organizationName}</strong> ya están disponibles.
        </p>
        ${params.resultsUrl ? ctaButton(params.resultsUrl, "Ver resultados", brand.accent_color) : ""}`;
      break;
  }

  const html = wrapLayout(bodyHtml, params, brand);
  return { subject, html };
}

// ---------------------------------------------------------------------------
// Shared layout wrapper
// ---------------------------------------------------------------------------
function wrapLayout(bodyHtml: string, params: BrandedEmailParams, brand: BrandConfig): string {
  const headerContent = params.logoUrl
    ? `<img src="${params.logoUrl}" alt="${params.organizationName}" style="max-height:40px;max-width:200px;margin:0 auto 8px;display:block" />`
    : `<h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700">${params.organizationName || "ClimaLab"}</h1>`;

  const footerText =
    brand.custom_email_footer ||
    (brand.show_powered_by
      ? `Enviado por ClimaLab · Plataforma de Clima Organizacional`
      : `Enviado por ${params.organizationName}`);

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <!-- Header -->
        <tr><td style="background:${brand.primary_color};padding:32px 40px;text-align:center">
          ${headerContent}
          <p style="color:rgba(255,255,255,0.7);margin:8px 0 0;font-size:14px">Encuesta de Clima Organizacional</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px">
          ${bodyHtml}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#fafafa;padding:24px 40px;text-align:center">
          <p style="color:#a1a1aa;font-size:12px;margin:0">
            ${footerText}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function ctaButton(url: string, label: string, color: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:8px 0 32px">
        <a href="${url}"
           style="display:inline-block;background:${color};color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:600">
          ${label}
        </a>
      </td></tr>
    </table>`;
}

function urlFallback(url: string): string {
  return `
    <p style="color:#71717a;font-size:13px;line-height:1.5;margin:0 0 8px">
      Si el botón no funciona, copia y pega esta URL en tu navegador:
    </p>
    <p style="color:#71717a;font-size:12px;word-break:break-all;margin:0 0 24px">
      ${url}
    </p>`;
}
