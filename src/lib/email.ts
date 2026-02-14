import { Resend } from "resend";
import { env } from "@/lib/env";

function getResend() {
  const key = env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY no configurado");
  return new Resend(key);
}

type SendInvitationParams = {
  to: string;
  participantName: string;
  organizationName: string;
  campaignName: string;
  surveyUrl: string;
};

export async function sendSurveyInvitation({
  to,
  participantName,
  organizationName,
  campaignName,
  surveyUrl,
}: SendInvitationParams) {
  const fromEmail = env.RESEND_FROM_EMAIL || "ClimaLab <noreply@climalab.app>";

  const { data, error } = await getResend().emails.send({
    from: fromEmail,
    to,
    subject: `${organizationName} te invita a participar en la encuesta de clima`,
    html: buildInvitationHtml({
      participantName,
      organizationName,
      campaignName,
      surveyUrl,
    }),
  });

  if (error) {
    return { success: false as const, error: error.message };
  }

  return { success: true as const, messageId: data?.id };
}

function buildInvitationHtml({
  participantName,
  organizationName,
  campaignName,
  surveyUrl,
}: Omit<SendInvitationParams, "to">) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <!-- Header -->
        <tr><td style="background:#18181b;padding:32px 40px;text-align:center">
          <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700">ClimaLab</h1>
          <p style="color:#a1a1aa;margin:8px 0 0;font-size:14px">Encuesta de Clima Organizacional</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px">
          <p style="color:#18181b;font-size:16px;margin:0 0 24px">
            Hola <strong>${participantName}</strong>,
          </p>
          <p style="color:#3f3f46;font-size:15px;line-height:1.6;margin:0 0 16px">
            <strong>${organizationName}</strong> te invita a participar en la encuesta
            de clima organizacional <strong>"${campaignName}"</strong>.
          </p>
          <p style="color:#3f3f46;font-size:15px;line-height:1.6;margin:0 0 24px">
            Tu participación es <strong>completamente anónima</strong>.
            Las respuestas individuales no serán compartidas con tu organización —
            solo se reportan resultados agregados.
          </p>
          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 32px">
              <a href="${surveyUrl}"
                 style="display:inline-block;background:#18181b;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:600">
                Responder encuesta
              </a>
            </td></tr>
          </table>
          <p style="color:#71717a;font-size:13px;line-height:1.5;margin:0 0 8px">
            Si el botón no funciona, copia y pega esta URL en tu navegador:
          </p>
          <p style="color:#71717a;font-size:12px;word-break:break-all;margin:0 0 24px">
            ${surveyUrl}
          </p>
          <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0">
          <p style="color:#a1a1aa;font-size:12px;line-height:1.5;margin:0">
            Este enlace es único y personal. No lo compartas con otras personas.
            La encuesta toma aproximadamente 10 minutos.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#fafafa;padding:24px 40px;text-align:center">
          <p style="color:#a1a1aa;font-size:12px;margin:0">
            Enviado por ClimaLab · Plataforma de Clima Organizacional
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
