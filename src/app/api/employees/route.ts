import { NextResponse } from "next/server";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { logAuditEvent } from "@/services/audit";

export async function GET() {
  try {
    const list = await db.select().from(employees).orderBy(desc(employees.createdAt));
    return NextResponse.json({ success: true, employees: list });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.name || !body.mobile) {
      return NextResponse.json({ success: false, error: "نام و شماره موبایل کارمند الزامی است." }, { status: 400 });
    }

    const code = body.code || `EMP-${Math.floor(10 + Math.random() * 90)}`;

    const [created] = await db
      .insert(employees)
      .values({
        code,
        name: body.name,
        mobile: body.mobile,
        role: body.role || "visitor",
        commissionRatePercent: body.commissionRatePercent ? body.commissionRatePercent.toString() : "5.00",
        notes: body.notes || null,
        status: "active",
      })
      .returning();

    await logAuditEvent("CREATE", "employee", created.id, { name: created.name, role: created.role });
    return NextResponse.json({ success: true, employee: created });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
