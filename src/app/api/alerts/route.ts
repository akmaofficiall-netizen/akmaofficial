import { NextResponse } from "next/server";
import { db } from "@/db";
import { alerts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { runAlertsEngineScan, getActiveAlerts } from "@/services/alerts";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    // Scan for new alerts automatically
    await runAlertsEngineScan();

    const activeList = await getActiveAlerts(projectId);
    return NextResponse.json({ success: true, alerts: activeList });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "resolve" && body.alertId) {
      await db
        .update(alerts)
        .set({ status: "resolved", updatedAt: new Date() })
        .where(eq(alerts.id, body.alertId));

      return NextResponse.json({ success: true, message: "هشدار برطرف گردید." });
    }

    return NextResponse.json({ success: false, error: "عملیات نامعتبر" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
