import { NextResponse } from "next/server";
import { pg } from "@/lib/db";

export async function GET() {
  try {
    const { rows } = await pg.query(
      `SELECT id::text, name, 
              CASE 
                WHEN status = 'cancelled' THEN 'archived' 
                ELSE status 
              END as status
         FROM core.missions
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 200`
    );
    return NextResponse.json({ missions: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "db_error" }, { status: 500 });
  }
}


