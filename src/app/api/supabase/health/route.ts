import { NextResponse } from "next/server";
import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing Supabase environment variables",
        required: [
          "NEXT_PUBLIC_SUPABASE_URL",
          "At least one key: NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY",
        ],
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

    const requiredTables = [
      "users",
      "workers",
      "clients",
      "venues",
      "jobs",
      "shifts",
      "timesheets",
      "invoices",
      "audit_logs",
    ];

    const missingTables: string[] = [];
    for (const table of requiredTables) {
      const { error: tableError } = await supabase.from(table).select("*", { count: "exact", head: true });
      if (tableError) {
        missingTables.push(table);
      }
    }

    if (missingTables.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing required database tables",
          missingTables,
          sqlHint: "Run supabase/week1_schema.sql in the Supabase SQL Editor (fresh project).",
        },
        { status: 500 },
      );
    }

    const { error: timesheetsProbe } = await supabase.from("timesheets").select("venue_name,approved_at").limit(1);
    if (timesheetsProbe) {
      const msg = timesheetsProbe.message || "";
      const looksLikeMissingColumn =
        /column|does not exist|Could not find/i.test(msg) || String(timesheetsProbe.code) === "42703";
      if (looksLikeMissingColumn) {
        return NextResponse.json(
          {
            ok: false,
            error: "timesheets table is missing Week 2 columns",
            sqlHint:
              "In Supabase SQL Editor, run the file supabase/week2_e2e.sql (safe to re-run). Fresh installs should run supabase/week1_schema.sql instead.",
          },
          { status: 500 },
        );
      }
      return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "Supabase connection configured and required tables are available",
      schemaWeek2: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
