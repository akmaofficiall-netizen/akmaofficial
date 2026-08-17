import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments, accounts, customers, invoices, projects } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { recalculateCustomerHealth } from "@/services/customerHealth";
import { logAuditEvent } from "@/services/audit";
import { requirePermission } from "@/services/access";

export async function GET() {
  try {
    await requirePermission("payments.view");
    const list = await db
      .select({
        payment: payments,
        accountName: accounts.name,
        customerName: customers.name,
        invoiceNumber: invoices.invoiceNumber,
        projectName: projects.name,
      })
      .from(payments)
      .innerJoin(accounts, eq(payments.accountId, accounts.id))
      .leftJoin(customers, eq(payments.customerId, customers.id))
      .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
      .leftJoin(projects, eq(payments.projectId, projects.id))
      .orderBy(desc(payments.createdAt));

    const formatted = list.map(({ payment, accountName, customerName, invoiceNumber, projectName }) => ({
      ...payment,
      accountName,
      customerName: customerName || "-",
      invoiceNumber: invoiceNumber || "-",
      projectName: projectName || "عمومی",
      amount: Number(payment.amount),
    }));

    return NextResponse.json({ success: true, payments: formatted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission("payments.create");
    const body = await req.json();

    if (!body.accountId || !body.amount || Number(body.amount) <= 0) {
      return NextResponse.json({ success: false, error: "حساب مالی و مبلغ دریافتی الزامی است." }, { status: 400 });
    }

    const payNum = `PAY-${Date.now().toString().slice(-6)}`;
    const amt = Number(body.amount);

    const [created] = await db
      .insert(payments)
      .values({
        paymentNumber: payNum,
        customerId: body.customerId || null,
        invoiceId: body.invoiceId || null,
        projectId: body.projectId || null,
        accountId: body.accountId,
        paymentType: body.paymentType || "customer_receipt",
        amount: amt.toString(),
        paymentMethod: body.paymentMethod || "pos",
        referenceNumber: body.referenceNumber || null,
        notes: body.notes || null,
        status: "completed",
      })
      .returning();

    // Update account balance
    await db
      .update(accounts)
      .set({
        balance: sql`${accounts.balance} + ${amt}`,
      })
      .where(eq(accounts.id, body.accountId));

    // If payment for invoice, update invoice paidAmount & balanceDue
    if (body.invoiceId) {
      const [inv] = await db.select().from(invoices).where(eq(invoices.id, body.invoiceId)).limit(1);
      if (inv) {
        const currentPaid = Number(inv.paidAmount) || 0;
        const gTotal = Number(inv.grandTotal) || 0;
        const newPaid = currentPaid + amt;
        const newBalance = Math.max(0, gTotal - newPaid);
        const newStatus = newBalance === 0 ? "paid" : "partial";

        await db
          .update(invoices)
          .set({
            paidAmount: newPaid.toString(),
            balanceDue: newBalance.toString(),
            paymentStatus: newStatus,
            updatedAt: new Date(),
          })
          .where(eq(invoices.id, body.invoiceId));
      }
    }

    if (body.customerId) {
      await recalculateCustomerHealth(body.customerId);
    }

    await logAuditEvent("CREATE", "payment", created.id, { amount: amt, paymentNumber: payNum });
    return NextResponse.json({ success: true, payment: created });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
