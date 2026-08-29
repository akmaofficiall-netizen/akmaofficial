import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { logAuditEvent } from "@/services/audit";
import { getEmployeeContext, getScopedProjectIds, requirePermission } from "@/services/access";

export async function GET() {
  try {
    await requirePermission("projects.view");
    let list = await db.select().from(projects).orderBy(desc(projects.createdAt));
    const scope = await getScopedProjectIds();
    const context = await getEmployeeContext();
    if (scope && context) list = list.filter((p) => scope.includes(p.id) || p.managerEmployeeId === context.employeeId);
    return NextResponse.json({ success: true, projects: list });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission("projects.create");
    const body = await req.json();
    if (!body.name || !body.code) {
      return NextResponse.json({ success: false, error: "کد و نام پروژه الزامی است." }, { status: 400 });
    }

    const [created] = await db
      .insert(projects)
      .values({
        code: body.code,
        name: body.name,
        label: body.label || null,
        description: body.description || null,
        color: body.color || "#3b82f6",
        icon: body.icon || "folder",
        status: body.status || "active",
        managerEmployeeId: body.managerEmployeeId || null,
        logoUrl: body.logoUrl || null,
        targetMonthlySales: body.targetMonthlySales != null ? String(body.targetMonthlySales) : "0",
        targetYearlySales: body.targetYearlySales != null ? String(body.targetYearlySales) : "0",
        targetCustomerCount: body.targetCustomerCount != null ? Number(body.targetCustomerCount) : 0,
        targetProfit: body.targetProfit != null ? String(body.targetProfit) : "0",
        targetCollection: body.targetCollection != null ? String(body.targetCollection) : "0",
        independentSalesAllowed: body.independentSalesAllowed === true,
      })
      .returning();

    await logAuditEvent("CREATE", "project", created.id, { code: created.code, name: created.name });
    return NextResponse.json({ success: true, project: created });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
