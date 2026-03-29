export function parseCsv(text: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentField += '"';
        index++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index++;
      }
      currentRow.push(currentField);
      currentField = "";
      if (currentRow.some((value) => value !== "")) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    currentField += char;
  }

  if (inQuotes) {
    throw new Error("El CSV contiene comillas sin cerrar");
  }

  currentRow.push(currentField);
  if (currentRow.some((value) => value !== "")) {
    rows.push(currentRow);
  }

  if (rows.length < 2) {
    throw new Error("El CSV debe tener encabezados y al menos una fila");
  }

  const headers = rows[0].map((value) => value.trim());
  return {
    headers,
    rows: rows.slice(1).map((row, rowIndex) => {
      if (row.length > headers.length) {
        throw new Error(`La fila ${rowIndex + 2} tiene más columnas que el encabezado`);
      }

      return headers.reduce<Record<string, string>>((acc, header, index) => {
        acc[header] = (row[index] ?? "").trim();
        return acc;
      }, {});
    }),
  };
}
