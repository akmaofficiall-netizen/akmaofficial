import { NextResponse } from "next/server";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requirePermission } from "@/services/access";
import { logAuditEvent } from "@/services/audit";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; await requirePermission("reports.view", id); const rows = await db.select().from(expenses).where(eq(expenses.projectId, id)).orderBy(desc(expenses.expenseDate)); return NextResponse.json({ success: true, expenses: rows.map((x:any)=>({...x, amount:Number(x.amount)})) }); }
  catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 403 }); }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; await requirePermission("projects.expense.manage", id); const b = await req.json(); if (!b.title || Number(b.amount) <= 0) return NextResponse.json({ success: false, error: "عنوان و مبلغ الزامی است" }, { status: 400 }); const [row] = await db.insert(expenses).values({ expenseNumber: `EXP-${Date.now().toString().slice(-8)}`, title: b.title, category: b.category || "عمومی", amount: String(b.amount), projectId: id, description: b.description || null, accountId: b.accountId || null, expenseDate: b.expenseDate ? new Date(b.expenseDate) : new Date() }).returning(); await logAuditEvent("CREATE", "expense", row.id, { projectId: id, amount: b.amount }); return NextResponse.json({ success: true, expense: row }); }
  catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 403 }); }
}
