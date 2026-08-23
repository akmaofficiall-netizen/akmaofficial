import { NextResponse } from "next/server";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { seedDatabase } from "@/db/seed";

export async function GET() {
  try {
    // Attempt auto-seed if database is fresh
    await seedDatabase();

    const [settings] = await db.select().from(systemSettings).limit(1);

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      businessName: settings?.businessName || "سیستم آکما",
      database: "connected",
    });
  } catch (error: any) {
    console.error("Health check error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Healthcheck failed" },
      { status: 500 }
    );
  }
}
