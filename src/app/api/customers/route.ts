import { NextResponse } from "next/server";
import { db } from "@/db";
import { customers, employees } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { recalculateCustomerHealth } from "@/services/customerHealth";
import { logAuditEvent } from "@/services/audit";

export async function GET() {
  try {
    const list = await db
      .select({
        customer: customers,
        employeeName: employees.name,
      })
      .from(customers)
      .leftJoin(employees, eq(customers.assignedEmployeeId, employees.id))
      .orderBy(desc(customers.createdAt));

    const formatted = list.map(({ customer, employeeName }: any) => ({
      ...customer,
      assignedEmployeeName: employeeName || "بدون ویزیتور",
      latitude: Number(customer.latitude),
      longitude: Number(customer.longitude),
      creditLimit: Number(customer.creditLimit),
    }));

    return NextResponse.json({ success: true, customers: formatted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.name || !body.mobile) {
      return NextResponse.json({ success: false, error: "نام مشتری و شماره موبایل الزامی است." }, { status: 400 });
    }

    const code = body.code || `CUST-${Math.floor(1000 + Math.random() * 9000)}`;

    const [created] = await db
      .insert(customers)
      .values({
        code,
        name: body.name,
        storeName: body.storeName || null,
        mobile: body.mobile,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        city: body.city || "تهران",
        latitude: body.latitude ? body.latitude.toString() : "35.6892",
        longitude: body.longitude ? body.longitude.toString() : "51.3890",
        assignedEmployeeId: body.assignedEmployeeId || null,
        notes: body.notes || null,
      })
      .returning();

    await recalculateCustomerHealth(created.id);
    await logAuditEvent("CREATE", "customer", created.id, { name: created.name, mobile: created.mobile });

    return NextResponse.json({ success: true, customer: created });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
