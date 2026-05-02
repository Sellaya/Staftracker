import { getSupabaseServerClient } from "@/lib/supabase";
import { generateId } from "@/lib/json-db";

export async function nextTableId(prefix: string, table: string): Promise<string> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from(table).select("id");
  if (error) throw new Error(error.message);
  const existingIds = Array.isArray(data) ? data.map((row: Record<string, unknown>) => String(row.id || "")) : [];
  return generateId(prefix, existingIds);
}

export async function findClientForActor(actor: { id: string; email: string }) {
  const supabase = getSupabaseServerClient();
  const lowered = actor.email.toLowerCase();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .or(`created_by_user_id.eq.${actor.id},email.ilike.${lowered}`)
    .limit(1);
  if (error) throw new Error(error.message);
  return (data && data[0]) || null;
}
