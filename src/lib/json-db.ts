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

export function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function generateWorkerId(existingIds: string[]): string {
  const existing = new Set(existingIds);
  for (let i = 0; i < 100; i += 1) {
    const candidate = `W-${Math.floor(1000 + Math.random() * 9000)}`;
    if (!existing.has(candidate)) return candidate;
  }

  for (let numeric = 1000; numeric <= 9999; numeric += 1) {
    const candidate = `W-${numeric}`;
    if (!existing.has(candidate)) return candidate;
  }

  throw new Error("No available 4-digit worker IDs remaining");
}
