import { NextResponse } from "next/server";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { desc } from "drizzle-orm";
import { logAuditEvent } from "@/services/audit";

export async function GET() {
  try {
    const list = await db.select().from(suppliers).orderBy(desc(suppliers.createdAt));
    return NextResponse.json({ success: true, suppliers: list });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.name || !body.mobile) {
      return NextResponse.json({ success: false, error: "نام تامین کننده و شماره موبایل الزامی است." }, { status: 400 });
    }

    const code = body.code || `SUP-${Math.floor(10 + Math.random() * 90)}`;

    const [created] = await db
      .insert(suppliers)
      .values({
        code,
        name: body.name,
        contactPerson: body.contactPerson || null,
        mobile: body.mobile,
        phone: body.phone || null,
        address: body.address || null,
        city: body.city || "تهران",
        notes: body.notes || null,
      })
      .returning();

    await logAuditEvent("CREATE", "supplier", created.id, { name: created.name });
    return NextResponse.json({ success: true, supplier: created });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
