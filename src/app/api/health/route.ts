import { NextResponse } from "next/server";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    const [settings] = await db.select().from(systemSettings).limit(1);
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      businessName: settings?.businessName || "سیستم آکما",
      database: "connected",
      uptime: Date.now() - start,
    });
  } catch (error: any) {
    console.error("Health check error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Healthcheck failed", database: "disconnected" },
      { status: 500 }
    );
  }
}
