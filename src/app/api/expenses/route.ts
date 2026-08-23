import { NextResponse } from "next/server";
import { db } from "@/db";
import { expenses, accounts, projects } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { logAuditEvent } from "@/services/audit";

export async function GET() {
  try {
    const list = await db
      .select({
        expense: expenses,
        accountName: accounts.name,
        projectName: projects.name,
      })
      .from(expenses)
      .leftJoin(accounts, eq(expenses.accountId, accounts.id))
      .leftJoin(projects, eq(expenses.projectId, projects.id))
      .orderBy(desc(expenses.createdAt));

    const formatted = list.map(({ expense, accountName, projectName }) => ({
      ...expense,
      accountName: accountName || "-",
      projectName: projectName || "عمومی",
      amount: Number(expense.amount),
    }));

    return NextResponse.json({ success: true, expenses: formatted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.title || !body.amount || Number(body.amount) <= 0) {
      return NextResponse.json({ success: false, error: "عنوان و مبلغ هزینه الزامی است." }, { status: 400 });
    }

    const expNum = `EXP-${Date.now().toString().slice(-6)}`;
    const amt = Number(body.amount);

    const [created] = await db
      .insert(expenses)
      .values({
        expenseNumber: expNum,
        title: body.title,
        category: body.category || "عمومی",
        amount: amt.toString(),
        projectId: body.projectId || null,
        accountId: body.accountId || null,
        description: body.description || null,
      })
      .returning();

    if (body.accountId) {
      await db
        .update(accounts)
        .set({ balance: sql`${accounts.balance} - ${amt}` })
        .where(eq(accounts.id, body.accountId));
    }

    await logAuditEvent("CREATE", "expense", created.id, { title: body.title, amount: amt });
    return NextResponse.json({ success: true, expense: created });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
