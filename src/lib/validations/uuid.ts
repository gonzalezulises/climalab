import { z } from "zod";

export const postgresUuidRegex =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const zUuid = (message = "UUID inválido") => z.string().regex(postgresUuidRegex, message);
