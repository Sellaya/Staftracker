import path from 'path';
import { readJsonFile, withFileLock, writeJsonFileAtomic, generateId } from './json-db';

const logPath = path.join(process.cwd(), 'audit_logs.json');

export async function recordLog(action: string, details: string, userEmail: string, userId: string) {
  try {
    const newLog = {
      id: generateId('LOG'),
      action,
      details,
      userEmail,
      userId,
      timestamp: new Date().toISOString()
    };

    await withFileLock(logPath, async () => {
      const db = await readJsonFile<{ logs: any[] }>(logPath, { logs: [] });
      db.logs.unshift(newLog); // Newest first
      if (db.logs.length > 1000) db.logs = db.logs.slice(0, 1000);
      await writeJsonFileAtomic(logPath, db);
    });
    return newLog;
  } catch (error) {
    console.error("Failed to record audit log:", error);
  }
}
