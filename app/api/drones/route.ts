import { NextResponse } from "next/server";
import { pg } from "@/lib/db";

export async function GET() {
  try {
    const { rows } = await pg.query(
      `SELECT id::text,
              name,
              COALESCE(current_latitude, 37.7749) as lat,
              COALESCE(current_longitude, -122.4194) as lon,
              COALESCE(current_altitude_m, 0) as altitude,
              CASE 
                WHEN status = 'active' THEN 'in-flight'
                WHEN status = 'idle' THEN 'idle'
                WHEN status = 'maintenance' THEN 'maintenance'
                ELSE 'idle'
              END as status
         FROM core.drones
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 200`
    );
    return NextResponse.json({ drones: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "db_error" }, { status: 500 });
  }
}


