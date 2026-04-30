import fs from 'fs/promises';
import path from 'path';

const logPath = path.join(process.cwd(), 'audit_logs.json');

export async function recordLog(action: string, details: string, userEmail: string, userId: string) {
  try {
    const data = await fs.readFile(logPath, 'utf8');
    const db = JSON.parse(data);
    
    const newLog = {
      id: `LOG-${Math.floor(Math.random() * 1000000)}`,
      action,
      details,
      userEmail,
      userId,
      timestamp: new Date().toISOString()
    };
    
    db.logs.unshift(newLog); // Newest first
    // Keep only last 1000 logs for performance
    if (db.logs.length > 1000) db.logs = db.logs.slice(0, 1000);
    
    await fs.writeFile(logPath, JSON.stringify(db, null, 2));
    return newLog;
  } catch (error) {
    console.error("Failed to record audit log:", error);
  }
}
