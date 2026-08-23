import { NextResponse } from "next/server";
import { db } from "@/db";
import { customers, invoices, products, rawMaterials, suppliers, projects, employees } from "@/db/schema";
import { ilike, or } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    if (!q || q.trim().length < 2) {
      return NextResponse.json({ success: true, results: [] });
    }

    const searchTerm = `%${q.trim()}%`;

    const [matchedCustomers, matchedInvoices, matchedProducts, matchedRawMaterials, matchedSuppliers, matchedProjects, matchedEmployees] =
      await Promise.all([
        db
          .select({ id: customers.id, title: customers.name, code: customers.code, detail: customers.mobile })
          .from(customers)
          .where(or(ilike(customers.name, searchTerm), ilike(customers.code, searchTerm), ilike(customers.mobile, searchTerm)))
          .limit(5),
        db
          .select({ id: invoices.id, title: invoices.invoiceNumber, code: invoices.invoiceNumber, detail: invoices.grandTotal })
          .from(invoices)
          .where(ilike(invoices.invoiceNumber, searchTerm))
          .limit(5),
        db
          .select({ id: products.id, title: products.name, code: products.code, detail: products.category })
          .from(products)
          .where(or(ilike(products.name, searchTerm), ilike(products.code, searchTerm)))
          .limit(5),
        db
          .select({ id: rawMaterials.id, title: rawMaterials.name, code: rawMaterials.code, detail: rawMaterials.unit })
          .from(rawMaterials)
          .where(or(ilike(rawMaterials.name, searchTerm), ilike(rawMaterials.code, searchTerm)))
          .limit(5),
        db
          .select({ id: suppliers.id, title: suppliers.name, code: suppliers.code, detail: suppliers.mobile })
          .from(suppliers)
          .where(or(ilike(suppliers.name, searchTerm), ilike(suppliers.code, searchTerm)))
          .limit(5),
        db
          .select({ id: projects.id, title: projects.name, code: projects.code, detail: projects.status })
          .from(projects)
          .where(or(ilike(projects.name, searchTerm), ilike(projects.code, searchTerm)))
          .limit(5),
        db
          .select({ id: employees.id, title: employees.name, code: employees.code, detail: employees.role })
          .from(employees)
          .where(or(ilike(employees.name, searchTerm), ilike(employees.code, searchTerm)))
          .limit(5),
      ]);

    const results = [
      ...matchedCustomers.map((item) => ({ ...item, type: "customer", typeLabel: "مشتری" })),
      ...matchedInvoices.map((item) => ({ ...item, type: "invoice", typeLabel: "فاکتور" })),
      ...matchedProducts.map((item) => ({ ...item, type: "product", typeLabel: "محصول" })),
      ...matchedRawMaterials.map((item) => ({ ...item, type: "raw_material", typeLabel: "ماده اولیه" })),
      ...matchedSuppliers.map((item) => ({ ...item, type: "supplier", typeLabel: "تامین‌کننده" })),
      ...matchedProjects.map((item) => ({ ...item, type: "project", typeLabel: "پروژه" })),
      ...matchedEmployees.map((item) => ({ ...item, type: "employee", typeLabel: "همکار/ویزیتور" })),
    ];

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
