import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, invoiceItems, customers, projects, employees, products, payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { reverseInvoice } from "@/services/invoice";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

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

    if (body.action === "reverse") {
      const reversed = await reverseInvoice(id, body.reason || "ابطال توسط کاربر");
      return NextResponse.json({ success: true, invoice: reversed });
    }

    return NextResponse.json({ success: false, error: "عملیات نا معتبر" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
