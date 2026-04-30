import { NextResponse } from "next/server";
import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing Supabase environment variables",
        required: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
      },
      { status: 500 },
    );
  }

  try {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.auth.getSession();
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "Supabase connection configured" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
