import path from "path";
import { readJsonFile, withFileLock, writeJsonFileAtomic, generateId } from "./json-db";
import { getSupabaseServerClient, hasSupabaseEnv } from "./supabase";
import { nextTableId } from "./supabase-db";

const logPath = path.join(process.cwd(), "audit_logs.json");

export async function recordLog(action: string, details: string, userEmail: string, userId: string) {
  const timestamp = new Date().toISOString();

  if (hasSupabaseEnv()) {
    try {
      const supabase = getSupabaseServerClient();
      const id = await nextTableId("LOG", "audit_logs");
      const { error } = await supabase.from("audit_logs").insert({
        id,
        action,
        details,
        user_email: userEmail,
        user_id: userId,
        timestamp,
      });
      if (!error) {
        return {
          id,
          action,
          details,
          userEmail,
          userId,
          timestamp,
        };
      }
      console.error("Supabase audit_logs insert failed:", error.message);
    } catch (error) {
      console.error("Supabase audit_logs insert failed:", error);
    }
  }

  try {
    const createdLog = await withFileLock(logPath, async () => {
      const db = await readJsonFile<{ logs: any[] }>(logPath, { logs: [] });
      const newLog = {
        id: generateId("LOG", db.logs.map((l: any) => String(l.id || ""))),
        action,
        details,
        userEmail,
        userId,
        timestamp,
      };
      db.logs.unshift(newLog);
      if (db.logs.length > 1000) db.logs = db.logs.slice(0, 1000);
      await writeJsonFileAtomic(logPath, db);
      return newLog;
    });
    return createdLog;
  } catch (error) {
    console.error("Failed to record audit log:", error);
  }
}
