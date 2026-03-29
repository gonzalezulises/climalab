import "server-only";

import { Resend } from "resend";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PipelineAlertEvent } from "@/lib/pipeline-alerts";
import type { Json } from "@/types/database";

function getResendClient() {
  if (!env.RESEND_API_KEY) {
    return null;
  }

  return new Resend(env.RESEND_API_KEY);
}

function formatAlertBundleHtml(input: {
  campaignName?: string | null;
  alerts: PipelineAlertEvent[];
}) {
  const title = input.campaignName
    ? `Alertas operativas de ClimaLab para ${input.campaignName}`
    : "Alertas operativas de ClimaLab";

  const items = input.alerts
    .map(
      (alert) =>
        `<li><strong>${alert.severity.toUpperCase()}</strong> · ${alert.message}<br /><code>${alert.code}</code></li>`
    )
    .join("");

  return {
    subject: title,
    html: `<div style="font-family:Arial,sans-serif"><h2>${title}</h2><ul>${items}</ul></div>`,
  };
}

export async function dispatchPipelineNotifications(input: {
  campaignId?: string | null;
  batchJobRunId?: string | null;
  campaignName?: string | null;
  alerts: PipelineAlertEvent[];
}) {
  const admin = createAdminClient();
  const severity = input.alerts.some((alert) => alert.severity === "critical")
    ? "critical"
    : "warning";
  const payload = {
    campaignId: input.campaignId ?? null,
    batchJobRunId: input.batchJobRunId ?? null,
    alerts: input.alerts,
    emittedAt: new Date().toISOString(),
  } as Json;

  if (input.alerts.length === 0) {
    return [];
  }

  const results: Array<{ channel: "webhook" | "email" | "log"; status: string }> = [];
  const insertBase = {
    campaign_id: input.campaignId ?? null,
    batch_job_run_id: input.batchJobRunId ?? null,
    alert_code: "operational_alert_bundle",
    severity,
    payload,
  };

  if (env.PIPELINE_ALERT_WEBHOOK_URL) {
    const { data: inserted } = await admin
      .from("pipeline_notifications")
      .insert({
        ...insertBase,
        channel: "webhook",
        status: "pending",
        recipient: env.PIPELINE_ALERT_WEBHOOK_URL,
      })
      .select("id")
      .single();

    try {
      const response = await fetch(env.PIPELINE_ALERT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      await admin
        .from("pipeline_notifications")
        .update({
          status: response.ok ? "sent" : "failed",
          error_message: response.ok ? null : `status_${response.status}`,
          sent_at: new Date().toISOString(),
        })
        .eq("id", inserted?.id ?? "");

      results.push({
        channel: "webhook",
        status: response.ok ? "sent" : "failed",
      });
    } catch (error) {
      await admin
        .from("pipeline_notifications")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "webhook_failed",
        })
        .eq("id", inserted?.id ?? "");

      results.push({
        channel: "webhook",
        status: "failed",
      });
    }
  }

  if (env.PIPELINE_ALERT_EMAIL_TO) {
    const recipients = env.PIPELINE_ALERT_EMAIL_TO.split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    const resend = getResendClient();
    const { data: inserted } = await admin
      .from("pipeline_notifications")
      .insert({
        ...insertBase,
        channel: "email",
        status: resend ? "pending" : "skipped",
        recipient: recipients.join(", "),
        error_message: resend ? null : "resend_not_configured",
      })
      .select("id")
      .single();

    if (resend) {
      const email = formatAlertBundleHtml({
        campaignName: input.campaignName,
        alerts: input.alerts,
      });
      const { error } = await resend.emails.send({
        from: env.RESEND_FROM_EMAIL || "ClimaLab <noreply@climalab.app>",
        to: recipients,
        subject: email.subject,
        html: email.html,
      });

      await admin
        .from("pipeline_notifications")
        .update({
          status: error ? "failed" : "sent",
          error_message: error?.message ?? null,
          sent_at: error ? null : new Date().toISOString(),
        })
        .eq("id", inserted?.id ?? "");

      results.push({
        channel: "email",
        status: error ? "failed" : "sent",
      });
    } else {
      results.push({
        channel: "email",
        status: "skipped",
      });
    }
  }

  if (!env.PIPELINE_ALERT_WEBHOOK_URL && !env.PIPELINE_ALERT_EMAIL_TO) {
    await admin.from("pipeline_notifications").insert({
      ...insertBase,
      channel: "log",
      status: "skipped",
      error_message: "notification_channels_not_configured",
    });

    results.push({
      channel: "log",
      status: "skipped",
    });
  }

  return results;
}
