import { NextResponse } from "next/server";
import { db } from "@/db";
import { customers, invoices, payments, customerHealthLogs, employees } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { recalculateCustomerHealth } from "@/services/customerHealth";
import { logAuditEvent } from "@/services/audit";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const [customer] = await db
      .select({
        customer: customers,
        employeeName: employees.name,
      })
      .from(customers)
      .leftJoin(employees, eq(customers.assignedEmployeeId, employees.id))
      .where(eq(customers.id, id))
      .limit(1);

    if (!customer) {
      return NextResponse.json({ success: false, error: "مشتری یافت نشد" }, { status: 404 });
    }

    const customerInvoices = await db
      .select()
      .from(invoices)
      .where(eq(invoices.customerId, id))
      .orderBy(desc(invoices.invoiceDate));

    const customerPayments = await db
      .select()
      .from(payments)
      .where(eq(payments.customerId, id))
      .orderBy(desc(payments.paymentDate));

    const healthLogs = await db
      .select()
      .from(customerHealthLogs)
      .where(eq(customerHealthLogs.customerId, id))
      .orderBy(desc(customerHealthLogs.createdAt));

    return NextResponse.json({
      success: true,
      customer: {
        ...customer.customer,
        assignedEmployeeName: customer.employeeName || "بدون ویزیتور",
        latitude: Number(customer.customer.latitude),
        longitude: Number(customer.customer.longitude),
      },
      invoices: customerInvoices,
      payments: customerPayments,
      healthLogs,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const [updated] = await db
      .update(customers)
      .set({
        name: body.name,
        storeName: body.storeName,
        mobile: body.mobile,
        phone: body.phone,
        email: body.email,
        address: body.address,
        city: body.city,
        latitude: body.latitude !== undefined ? body.latitude.toString() : undefined,
        longitude: body.longitude !== undefined ? body.longitude.toString() : undefined,
        assignedEmployeeId: body.assignedEmployeeId,
        notes: body.notes,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id))
      .returning();

    await recalculateCustomerHealth(id);
    await logAuditEvent("UPDATE", "customer", id, { name: updated.name });

    return NextResponse.json({ success: true, customer: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
