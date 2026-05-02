import path from "path";
import { readJsonFile } from "@/lib/json-db";
import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase";

const workersPath = path.join(process.cwd(), "workers.json");

/** MVP Week 1/2: only Active + document-approved workers may browse/apply to open shifts (per spec). */
export async function workerMayAccessOpenMarketplace(actorId: string): Promise<boolean> {
  if (hasSupabaseEnv()) {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("workers")
      .select("status, document_status")
      .eq("id", actorId)
      .maybeSingle();
    if (error || !data) return false;
    const row = data as Record<string, unknown>;
    const status = String(row.status ?? "");
    const docStatus = String(row.document_status ?? row.documentStatus ?? "");
    return status === "Active" && docStatus === "Approved";
  }
  const workers = await readJsonFile<any[]>(workersPath, []);
  const w = workers.find((x: any) => x.id === actorId);
  return Boolean(w && w.status === "Active" && w.documentStatus === "Approved");
}
