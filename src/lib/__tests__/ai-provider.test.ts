import { describe, expect, test } from "vitest";
import { extractJSON } from "@/lib/ai/json";
import { resolveAiProviderMetadata } from "@/lib/ai/provider";

describe("resolveAiProviderMetadata", () => {
  test("prioritizes openai over other configured backends", () => {
    expect(
      resolveAiProviderMetadata({
        OPENAI_API_KEY: "openai",
        OPENAI_MODEL: "gpt-4o",
        ANTHROPIC_API_KEY: "anthropic",
        ANTHROPIC_MODEL: "claude",
        OLLAMA_BASE_URL: "http://localhost:11434",
        OLLAMA_MODEL: "llama",
      })
    ).toEqual({
      provider: "openai",
      model: "gpt-4o",
    });
  });

  test("falls back to anthropic and then ollama", () => {
    expect(
      resolveAiProviderMetadata({
        ANTHROPIC_API_KEY: "anthropic",
        ANTHROPIC_MODEL: "claude",
      })
    ).toEqual({
      provider: "anthropic",
      model: "claude",
    });

    expect(
      resolveAiProviderMetadata({
        OLLAMA_BASE_URL: "http://localhost:11434",
        OLLAMA_MODEL: "llama",
      })
    ).toEqual({
      provider: "ollama",
      model: "llama",
    });
  });

  test("returns null metadata when no backend is configured", () => {
    expect(resolveAiProviderMetadata({})).toEqual({
      provider: null,
      model: null,
    });
  });
});

describe("extractJSON", () => {
  test("extracts object payloads from model text", () => {
    expect(extractJSON<{ ok: boolean }>('respuesta {"ok":true} fin')).toEqual({ ok: true });
  });

  test("extracts array payloads from model text", () => {
    expect(extractJSON<Array<{ n: number }>>('salida [{"n":1}]')).toEqual([{ n: 1 }]);
  });

  test("returns null for invalid payloads", () => {
    expect(extractJSON("sin json")).toBeNull();
  });
});
