import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    // A simple query to wake up and keep the Supabase database alive.
    // Fetching exactly 1 row is highly efficient and guarantees the DB is queried.
    const { data, error } = await supabase
      .from("rooms")
      .select("id")
      .limit(1);

    if (error) {
      console.error("Keepalive DB error:", error);
      return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: "success", message: "Database is awake." });
  } catch (err: any) {
    console.error("Keepalive exception:", err);
    return NextResponse.json({ status: "error", message: err.message }, { status: 500 });
  }
}
