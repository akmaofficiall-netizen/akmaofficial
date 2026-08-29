import { NextResponse } from "next/server";
import { db } from "@/db";
import { expenses, accounts, payments } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { requirePermission } from "@/services/access";
import { logAuditEvent } from "@/services/audit";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requirePermission("reports.view", id);

    const rows = await db
      .select({
        id: expenses.id,
        expenseNumber: expenses.expenseNumber,
        title: expenses.title,
        category: expenses.category,
        amount: expenses.amount,
        projectId: expenses.projectId,
        accountId: expenses.accountId,
        description: expenses.description,
        expenseDate: expenses.expenseDate,
        createdAt: expenses.createdAt,
        accountName: accounts.name,
      })
      .from(expenses)
      .leftJoin(accounts, eq(expenses.accountId, accounts.id))
      .where(eq(expenses.projectId, id))
      .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt));

    return NextResponse.json({
      success: true,
      expenses: rows.map((x: any) => ({ ...x, amount: Number(x.amount) })),
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 403 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requirePermission("projects.expense.manage", id);
    const b = await req.json();

    if (!b.title || Number(b.amount) <= 0) {
      return NextResponse.json({ success: false, error: "عنوان و مبلغ هزینه الزامی است." }, { status: 400 });
    }

    const amt = Number(b.amount);

    if (b.accountId) {
      const [acc] = await db.select().from(accounts).where(eq(accounts.id, b.accountId)).limit(1);
      if (!acc) {
        return NextResponse.json({ success: false, error: "حساب مالی انتخاب شده یافت نشد." }, { status: 404 });
      }
      const currentBalance = Number(acc.balance) || 0;
      if (currentBalance < amt) {
        return NextResponse.json(
          {
            success: false,
            error: `موجودی حساب «${acc.name}» کافی نیست و نمی‌تواند منفی باشد. موجودی فعلی: ${currentBalance.toLocaleString("fa-IR")} تومان، مبلغ هزینه: ${amt.toLocaleString("fa-IR")} تومان.`,
          },
          { status: 400 }
        );
      }

      await db
        .update(accounts)
        .set({ balance: sql`${accounts.balance} - ${amt}` })
        .where(eq(accounts.id, b.accountId));

      await db.insert(payments).values({
        paymentNumber: `PAY-EXP-${Date.now().toString().slice(-8)}`,
        paymentType: "expense_payment",
        amount: String(amt),
        accountId: b.accountId,
        projectId: id,
        notes: `ثبت خودکار هزینه پروژه: ${b.title}`,
        paymentDate: b.expenseDate ? new Date(b.expenseDate) : new Date(),
        paymentMethod: "pos",
        status: "completed",
      });
    }

    const [row] = await db
      .insert(expenses)
      .values({
        expenseNumber: `EXP-${Date.now().toString().slice(-8)}`,
        title: b.title,
        category: b.category || "عمومی",
        amount: String(amt),
        projectId: id,
        description: b.description || null,
        accountId: b.accountId || null,
        expenseDate: b.expenseDate ? new Date(b.expenseDate) : new Date(),
      })
      .returning();

    await logAuditEvent("CREATE", "expense", row.id, { projectId: id, amount: amt, accountId: b.accountId });
    return NextResponse.json({ success: true, expense: row });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 403 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    await requirePermission("projects.expense.manage", projectId);
    const { searchParams } = new URL(req.url);
    const expenseId = searchParams.get("expenseId");

    if (!expenseId) {
      return NextResponse.json({ success: false, error: "شناسه هزینه الزامی است." }, { status: 400 });
    }

    const [exp] = await db.select().from(expenses).where(eq(expenses.id, expenseId)).limit(1);
    if (!exp) {
      return NextResponse.json({ success: false, error: "هزینه یافت نشد." }, { status: 404 });
    }

    if (exp.accountId) {
      const refundAmt = Number(exp.amount) || 0;
      await db
        .update(accounts)
        .set({ balance: sql`${accounts.balance} + ${refundAmt}` })
        .where(eq(accounts.id, exp.accountId));

      await db.insert(payments).values({
        paymentNumber: `PAY-REF-${Date.now().toString().slice(-8)}`,
        paymentType: "customer_receipt",
        amount: String(refundAmt),
        accountId: exp.accountId,
        projectId,
        notes: `استرداد و لغو هزینه پروژه: ${exp.title}`,
        paymentDate: new Date(),
        paymentMethod: "pos",
        status: "completed",
      });
    }

    await db.delete(expenses).where(eq(expenses.id, expenseId));
    await logAuditEvent("DELETE", "expense", expenseId, { projectId });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 403 });
  }
}
