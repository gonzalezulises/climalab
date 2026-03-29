import { timingSafeEqual } from "crypto";
import { env } from "@/lib/env";

export function assertIngestSecret(request: Request) {
  const expected = env.INGEST_API_SECRET;
  if (!expected) {
    throw new Error("INGEST_API_SECRET no configurada");
  }

  const provided =
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
    throw new Error("Credenciales de ingesta inválidas");
  }
}
