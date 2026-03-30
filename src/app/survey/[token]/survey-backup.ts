const BACKUP_PREFIX = "climalab_survey_";

export function getBackupKey(token: string) {
  return `${BACKUP_PREFIX}${token}`;
}

export function saveBackup(token: string, data: { scores: Record<string, number> }) {
  try {
    localStorage.setItem(getBackupKey(token), JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

export function loadBackup(token: string): { scores: Record<string, number> } | null {
  try {
    const raw = localStorage.getItem(getBackupKey(token));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearBackup(token: string) {
  try {
    localStorage.removeItem(getBackupKey(token));
  } catch {
    // ignore
  }
}

export async function retryAsync<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }

  throw new Error("Unreachable");
}
