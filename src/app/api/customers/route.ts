import { NextResponse } from "next/server";
import { db } from "@/db";
import { customers, employees, customerProjectMemberships } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { recalculateCustomerHealth } from "@/services/customerHealth";
import { logAuditEvent } from "@/services/audit";
import { getEmployeeContext, requirePermission } from "@/services/access";

export async function GET(req: Request) {
  try {
    await requirePermission("customers.view");
    let list = await db
      .select({
        customer: customers,
        employeeName: employees.name,
      })
      .from(customers)
      .leftJoin(employees, eq(customers.assignedEmployeeId, employees.id))
      .orderBy(desc(customers.createdAt));
    const context = await getEmployeeContext();
    if (context) list = list.filter((row) => row.customer.assignedEmployeeId === context.employeeId);
    const projectId = new URL(req.url).searchParams.get("projectId");
    if (projectId) { const ids = await db.select({customerId: customerProjectMemberships.customerId}).from(customerProjectMemberships).where(eq(customerProjectMemberships.projectId, projectId)); const set = new Set(ids.map(x=>x.customerId)); list = list.filter(row=>set.has(row.customer.id)); }

    const formatted = list.map(({ customer, employeeName }) => ({
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
    const context = await requirePermission("customers.create", body.projectId || null);
    if (!body.name || !body.mobile) {
      return NextResponse.json({ success: false, error: "نام مشتری و شماره موبایل الزامی است." }, { status: 400 });
    }

    const code = body.code || `CUST-${Date.now().toString().slice(-8)}`;

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
        assignedEmployeeId: context?.permissions.has("*") || context?.permissions.has("customers.transfer") ? (body.assignedEmployeeId || context?.employeeId || null) : (context?.employeeId || null),
        notes: body.notes || null,
      })
      .returning();

    await recalculateCustomerHealth(created.id);
    if (context?.employeeId) {
      const projectId = body.projectId || null;
      const { assignCustomer } = await import("@/services/partner");
      await assignCustomer(created.id, context.employeeId, projectId, "employee_created", context.employeeId);
    }
    await logAuditEvent("CREATE", "customer", created.id, { name: created.name, mobile: created.mobile, employeeId: context?.employeeId || null, projectId: body.projectId || null });

    return NextResponse.json({ success: true, customer: created });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
