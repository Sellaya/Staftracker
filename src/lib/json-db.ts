import fs from "fs/promises";
import crypto from "crypto";

const fileLocks = new Map<string, Promise<void>>();

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJsonFileAtomic<T>(filePath: string, data: T): Promise<void> {
  const tmpPath = `${filePath}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2));
  await fs.rename(tmpPath, filePath);
}

export async function withFileLock<T>(filePath: string, operation: () => Promise<T>): Promise<T> {
  const previous = fileLocks.get(filePath) || Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });

  fileLocks.set(filePath, previous.then(() => current));
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (fileLocks.get(filePath) === current) {
      fileLocks.delete(filePath);
    }
  }
}

function parseNumericId(id: string, prefix: string): number | null {
  const match = String(id).match(new RegExp(`^${prefix}-(\\d{4})$`));
  if (!match) return null;
  return Number(match[1]);
}

export function generateId(prefix: string, existingIds: string[] = []): string {
  const numericIds = existingIds
    .map((id) => parseNumericId(id, prefix))
    .filter((n): n is number => typeof n === "number");
  const used = new Set(numericIds);

  for (let numeric = 1; numeric <= 9999; numeric += 1) {
    if (!used.has(numeric)) {
      return `${prefix}-${String(numeric).padStart(4, "0")}`;
    }
  }
  throw new Error(`No available 4-digit ${prefix} IDs remaining`);
}

export function generateWorkerId(existingIds: string[]): string {
  return generateId("W", existingIds);
}
