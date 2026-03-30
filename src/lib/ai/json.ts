export function extractJSON<T>(text: string): T | null {
  const objMatch = text.match(/\{[\s\S]*\}/);
  const arrMatch = text.match(/\[[\s\S]*\]/);
  const match =
    objMatch && arrMatch
      ? objMatch.index! <= arrMatch.index!
        ? objMatch
        : arrMatch
      : (objMatch ?? arrMatch);

  if (!match) return null;

  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}
