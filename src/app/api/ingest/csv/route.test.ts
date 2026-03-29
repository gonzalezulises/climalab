import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/csv-ingest";

describe("parseCsv", () => {
  it("preserves commas and newlines inside quoted fields", () => {
    const parsed = parseCsv(
      [
        "external_event_id,department,open:general,item:123",
        'evt-1,People,"Texto, con coma',
        'y salto de linea",4',
      ].join("\n")
    );

    expect(parsed.headers).toEqual(["external_event_id", "department", "open:general", "item:123"]);
    expect(parsed.rows).toEqual([
      {
        external_event_id: "evt-1",
        department: "People",
        "open:general": "Texto, con coma\ny salto de linea",
        "item:123": "4",
      },
    ]);
  });

  it("unescapes doubled quotes inside quoted fields", () => {
    const parsed = parseCsv(["external_event_id,open:general", 'evt-2,"Dijo ""hola"""'].join("\n"));

    expect(parsed.rows[0]?.["open:general"]).toBe('Dijo "hola"');
  });
});
