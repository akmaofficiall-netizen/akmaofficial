import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, invoiceItems, customers, projects, employees, products, payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { reverseInvoice } from "@/services/invoice";
import { requirePermission } from "@/services/access";
import { logAuditEvent } from "@/services/audit";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const context = await requirePermission("invoices.view");

    const [inv] = await db
      .select({
        invoice: invoices,
        customerName: customers.name,
        customerStore: customers.storeName,
        customerAddress: customers.address,
        customerMobile: customers.mobile,
        projectName: projects.name,
        employeeName: employees.name,
      })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customerId, customers.id))
      .leftJoin(projects, eq(invoices.projectId, projects.id))
      .leftJoin(employees, eq(invoices.employeeId, employees.id))
      .where(eq(invoices.id, id))
      .limit(1);

    if (!inv) {
      return NextResponse.json({ success: false, error: "فاکتور یافت نشد" }, { status: 404 });
    }
    if (context && inv.invoice.employeeId !== context.employeeId) {
      return NextResponse.json({ success: false, error: "دسترسی به این فاکتور مجاز نیست" }, { status: 403 });
    }

    const items = await db
      .select({
        item: invoiceItems,
        productCode: products.code,
        productUnit: products.unit,
      })
      .from(invoiceItems)
      .innerJoin(products, eq(invoiceItems.productId, products.id))
      .where(eq(invoiceItems.invoiceId, id));

    const invoicePayments = await db
      .select()
      .from(payments)
      .where(eq(payments.invoiceId, id));

    return NextResponse.json({
      success: true,
      invoice: {
        ...inv.invoice,
        customerName: inv.customerName,
        customerStore: inv.customerStore,
        customerAddress: inv.customerAddress,
        customerMobile: inv.customerMobile,
        projectName: inv.projectName,
        employeeName: inv.employeeName,
        subtotal: Number(inv.invoice.subtotal),
        grandTotal: Number(inv.invoice.grandTotal),
        paidAmount: Number(inv.invoice.paidAmount),
        balanceDue: Number(inv.invoice.balanceDue),
      },
      items: items.map(({ item, productCode, productUnit }) => ({
        ...item,
        productCode,
        productUnit,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discountAmount: Number(item.discountAmount),
        lineTotal: Number(item.lineTotal),
      })),
      payments: invoicePayments,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const context = await requirePermission(body.action === "reverse" ? "invoices.update" : "invoices.update");
    const [existing] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    if (!existing) return NextResponse.json({ success: false, error: "فاکتور یافت نشد" }, { status: 404 });
    if (context && existing.employeeId !== context.employeeId) return NextResponse.json({ success: false, error: "دسترسی به این فاکتور مجاز نیست" }, { status: 403 });

    if (body.action === "reverse") {
      const reversed = await reverseInvoice(id, body.reason || "ابطال توسط کاربر");
      return NextResponse.json({ success: true, invoice: reversed });
    }

    return NextResponse.json({ success: false, error: "عملیات نا معتبر" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const context = await requirePermission("invoices.update", body.projectId || null);
    const [existing] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    if (!existing) return NextResponse.json({ success: false, error: "فاکتور یافت نشد" }, { status: 404 });
    if (context && existing.employeeId !== context.employeeId) return NextResponse.json({ success: false, error: "دسترسی به این فاکتور مجاز نیست" }, { status: 403 });

    const patch: any = { updatedAt: new Date() };
    if (body.notes !== undefined) patch.notes = body.notes || null;
    if (body.dueDate !== undefined) patch.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.invoiceDate !== undefined) patch.invoiceDate = body.invoiceDate ? new Date(body.invoiceDate) : existing.invoiceDate;
    if (body.paymentStatus !== undefined) {
      const next = String(body.paymentStatus);
      if (!["unpaid","partial","paid"].includes(next)) return NextResponse.json({ success:false, error:"وضعیت پرداخت نامعتبر است" }, {status:400});
      if (next === "paid") {
        if (Number(existing.balanceDue) > 0) return NextResponse.json({ success:false, error:"برای ثبت پرداخت کامل از بخش پرداخت استفاده کنید تا سند مالی ثبت شود." }, {status:400});
      } else if (next === "unpaid" && Number(existing.paidAmount) > 0) {
        return NextResponse.json({ success:false, error:"این فاکتور قبلاً پرداخت داشته است؛ برای برگشت پرداخت باید تراکنش پرداخت اصلاح شود." }, {status:400});
      }
      patch.paymentStatus = next;
    }
    const [updated] = await db.update(invoices).set(patch).where(eq(invoices.id, id)).returning();
    await logAuditEvent("UPDATE", "invoice", id, { fields: Object.keys(patch), paymentStatus: patch.paymentStatus ?? existing.paymentStatus });
    return NextResponse.json({ success:true, invoice: updated });
  } catch (error: any) {
    return NextResponse.json({ success:false, error:error.message }, {status:500});
  }
}
