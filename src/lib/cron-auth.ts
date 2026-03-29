import { timingSafeEqual } from "crypto";
import { env } from "@/lib/env";

export function assertCronSecret(request: Request) {
  const expected = env.CRON_SECRET;
  if (!expected) {
    throw new Error("CRON_SECRET no configurada");
  }

  const provided =
    request.headers.get("x-cron-secret") ??
    request.headers.get("x-api-key") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (
    expectedBuffer.length === 0 ||
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    throw new Error("Credenciales de cron inválidas");
  }
}
