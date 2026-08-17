import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, invoiceItems, customers, projects, employees, payments } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { createInvoice, reverseInvoice } from "@/services/invoice";
import { createInvoice, reverseInvoice } from "@/services/invoice";
import { requirePermission } from "@/services/access";

export async function GET(req: Request) {
  try {
    await requirePermission("invoices.view", new URL(req.url).searchParams.get("projectId"));
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const customerId = searchParams.get("customerId");

    const query = db
      .select({
        invoice: invoices,
        customerName: customers.name,
        customerStore: customers.storeName,
        projectName: projects.name,
        employeeName: employees.name,
      })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customerId, customers.id))
      .leftJoin(projects, eq(invoices.projectId, projects.id))
      .leftJoin(employees, eq(invoices.employeeId, employees.id))
      .orderBy(desc(invoices.createdAt));

    const results = await query;

    const filtered = results.filter(({ invoice }) => {
      if (projectId && invoice.projectId !== projectId) return false;
      if (customerId && invoice.customerId !== customerId) return false;
      return true;
    });

    const formatted = filtered.map(({ invoice, customerName, customerStore, projectName, employeeName }) => ({
      ...invoice,
      customerName: customerStore ? `${customerName} (${customerStore})` : customerName,
      projectName: projectName || "عمومی",
      employeeName: employeeName || "-",
      subtotal: Number(invoice.subtotal),
      grandTotal: Number(invoice.grandTotal),
      cogsTotal: Number(invoice.cogsTotal),
      grossProfitTotal: Number(invoice.grossProfitTotal),
      paidAmount: Number(invoice.paidAmount),
      balanceDue: Number(invoice.balanceDue),
    }));

    return NextResponse.json({ success: true, invoices: formatted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.clone().json().catch(() => ({}));
    await requirePermission("invoices.view", body.projectId || null);
    const body = await req.json();

    if (!body.customerId || !body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: "انتخاب مشتری و حداقل یک اقلام فاکتور الزامی است." },
        { status: 400 }
      );
    }

    const created = await createInvoice({
      customerId: body.customerId,
      projectId: body.projectId || null,
      salesMode: body.salesMode || "direct",
      employeeId: body.employeeId || null,
      intermediaryEmployeeId: body.intermediaryEmployeeId || null,
      invoiceDiscount: body.invoiceDiscount ? Number(body.invoiceDiscount) : 0,
      taxTotal: body.taxTotal ? Number(body.taxTotal) : 0,
      items: body.items,
      initialPayment: body.initialPayment,
      notes: body.notes,
      manualInvoiceNumber: body.manualInvoiceNumber,
    });

    return NextResponse.json({ success: true, invoice: created });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
