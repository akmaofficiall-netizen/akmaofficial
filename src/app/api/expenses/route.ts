import { NextResponse } from "next/server";
import { db } from "@/db";
import { expenses, accounts, projects } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { logAuditEvent } from "@/services/audit";
import { requirePermission } from "@/services/access";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    await requirePermission("expenses.view", projectId);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));
    const offset = (page - 1) * pageSize;

    const list = await db
      .select({
        expense: expenses,
        accountName: accounts.name,
        projectName: projects.name,
      })
      .from(expenses)
      .leftJoin(accounts, eq(expenses.accountId, accounts.id))
      .leftJoin(projects, eq(expenses.projectId, projects.id))
      .orderBy(desc(expenses.createdAt))
      .limit(pageSize)
      .offset(offset);

    const [{ count: totalStr }] = await db.execute(sql`SELECT COUNT(*)::int as count FROM expenses`) as any;
    const total = Number((totalStr as any)?.count ?? (totalStr as any) ?? 0) || list.length;

    const formatted = list.map(({ expense, accountName, projectName }) => ({
      ...expense,
      accountName: accountName || "-",
      projectName: projectName || "عمومی",
      amount: Number(expense.amount),
    }));

    return NextResponse.json({ success: true, expenses: formatted, pagination: { page, pageSize, total } });
  } catch (error: any) {
    const status = error.message?.includes("دسترسی") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const context = await requirePermission("expenses.create", body.projectId || null);

    if (!body.title || !body.amount || Number(body.amount) <= 0) {
      return NextResponse.json({ success: false, error: "عنوان و مبلغ هزینه الزامی است." }, { status: 400 });
    }
    if (!body.accountId) {
      return NextResponse.json({ success: false, error: "انتخاب حساب پرداخت‌کننده الزامی است." }, { status: 400 });
    }
    if (!body.category) {
      return NextResponse.json({ success: false, error: "دسته‌بندی هزینه الزامی است." }, { status: 400 });
    }

    const expNum = `EXP-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const amt = Number(body.amount);

    if (amt <= 0 || !isFinite(amt)) {
      return NextResponse.json({ success: false, error: "مبلغ هزینه نامعتبر است." }, { status: 400 });
    }

    const created = await db.transaction(async (tx) => {
      const [acc] = await tx.select().from(accounts).where(eq(accounts.id, body.accountId)).for("update").limit(1);
      if (!acc) {
        throw new Error("حساب مالی انتخاب شده یافت نشد.");
      }
      const currentBalance = Number(acc.balance) || 0;
      if (currentBalance < amt) {
        throw new Error(
          `موجودی حساب «${acc.name}» کافی نیست. موجودی فعلی: ${currentBalance.toLocaleString("fa-IR")} تومان، مبلغ هزینه: ${amt.toLocaleString("fa-IR")} تومان.`
        );
      }

      await tx
        .update(accounts)
        .set({ balance: sql`${accounts.balance} - ${amt}` })
        .where(eq(accounts.id, body.accountId));

      const [res] = await tx
        .insert(expenses)
        .values({
          expenseNumber: expNum,
          title: body.title,
          category: body.category,
          amount: amt.toString(),
          projectId: body.projectId || null,
          accountId: body.accountId,
          employeeId: context.employeeId,
          description: body.description || null,
          expenseDate: body.expenseDate ? new Date(body.expenseDate) : new Date(),
        })
        .returning();

      return res;
    });

    await logAuditEvent("CREATE", "expense", created.id, {
      title: body.title,
      amount: amt,
      accountId: body.accountId,
      projectId: body.projectId,
    }, { userId: context.employeeId, userName: context.roleCode });

    return NextResponse.json({ success: true, expense: created });
  } catch (error: any) {
    const status = error.message?.includes("دسترسی") ? 403 : error.message?.includes("موجودی حساب") ? 400 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
