import { NextResponse } from "next/server";
import { db } from "@/db";
import { expenses, accounts, projects } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { logAuditEvent } from "@/services/audit";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [expense] = await db
      .select({
        expense: expenses,
        accountName: accounts.name,
        projectName: projects.name,
      })
      .from(expenses)
      .leftJoin(accounts, eq(expenses.accountId, accounts.id))
      .leftJoin(projects, eq(expenses.projectId, projects.id))
      .where(eq(expenses.id, id))
      .limit(1);

    if (!expense) {
      return NextResponse.json({ success: false, error: "سند هزینه یافت نشد." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      expense: {
        ...expense.expense,
        accountName: expense.accountName || "-",
        projectName: expense.projectName || "عمومی",
        amount: Number(expense.expense.amount),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const [existing] = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ success: false, error: "سند هزینه یافت نشد." }, { status: 404 });
    }

    const oldAmount = Number(existing.amount) || 0;
    const newAmount = body.amount !== undefined ? Number(body.amount) : oldAmount;
    if (newAmount <= 0) {
      return NextResponse.json({ success: false, error: "مبلغ هزینه باید بزرگتر از صفر باشد." }, { status: 400 });
    }

    const oldAccountId = existing.accountId;
    const newAccountId = body.accountId !== undefined ? (body.accountId || null) : oldAccountId;

    // Account Balance adjustment logic
    if (oldAccountId === newAccountId && newAccountId) {
      const diff = newAmount - oldAmount;
      if (diff > 0) {
        // Amount increased -> check if account has enough balance
        const [acc] = await db.select().from(accounts).where(eq(accounts.id, newAccountId)).limit(1);
        if (!acc) return NextResponse.json({ success: false, error: "حساب مالی یافت نشد." }, { status: 404 });
        const currentBalance = Number(acc.balance) || 0;
        if (currentBalance < diff) {
          return NextResponse.json(
            {
              success: false,
              error: `موجودی حساب «${acc.name}» کافی نیست و نمی‌تواند منفی باشد. موجودی فعلی: ${currentBalance.toLocaleString("fa-IR")} تومان، افزایش مورد نیاز: ${diff.toLocaleString("fa-IR")} تومان.`,
            },
            { status: 400 }
          );
        }
      }
      // Apply diff to account
      await db
        .update(accounts)
        .set({ balance: sql`${accounts.balance} - ${diff}` })
        .where(eq(accounts.id, newAccountId));
    } else {
      // Account changed
      // 1. Refund old account
      if (oldAccountId) {
        await db
          .update(accounts)
          .set({ balance: sql`${accounts.balance} + ${oldAmount}` })
          .where(eq(accounts.id, oldAccountId));
      }
      // 2. Deduct from new account
      if (newAccountId) {
        const [newAcc] = await db.select().from(accounts).where(eq(accounts.id, newAccountId)).limit(1);
        if (!newAcc) return NextResponse.json({ success: false, error: "حساب جدید یافت نشد." }, { status: 404 });
        const newBalance = Number(newAcc.balance) || 0;
        if (newBalance < newAmount) {
          // Rollback old account refund
          if (oldAccountId) {
            await db
              .update(accounts)
              .set({ balance: sql`${accounts.balance} - ${oldAmount}` })
              .where(eq(accounts.id, oldAccountId));
          }
          return NextResponse.json(
            {
              success: false,
              error: `موجودی حساب جدید «${newAcc.name}» کافی نیست و نمی‌تواند منفی باشد. موجودی فعلی: ${newBalance.toLocaleString("fa-IR")} تومان، مبلغ هزینه: ${newAmount.toLocaleString("fa-IR")} تومان.`,
            },
            { status: 400 }
          );
        }
        await db
          .update(accounts)
          .set({ balance: sql`${accounts.balance} - ${newAmount}` })
          .where(eq(accounts.id, newAccountId));
      }
    }

    const updatePayload: Record<string, any> = { updatedAt: new Date() };
    if (body.title !== undefined) updatePayload.title = body.title.trim();
    if (body.category !== undefined) updatePayload.category = body.category;
    if (body.amount !== undefined) updatePayload.amount = newAmount.toString();
    if (body.projectId !== undefined) updatePayload.projectId = body.projectId || null;
    if (body.accountId !== undefined) updatePayload.accountId = newAccountId;
    if (body.description !== undefined) updatePayload.description = body.description || null;

    const [updated] = await db.update(expenses).set(updatePayload).where(eq(expenses.id, id)).returning();

    await logAuditEvent("UPDATE", "expense", id, {
      title: updated.title,
      oldAmount,
      newAmount,
      accountId: updated.accountId,
    });

    return NextResponse.json({
      success: true,
      expense: updated,
      message: `سند هزینه «${updated.title}» با موفقیت ویرایش شد.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [existing] = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ success: false, error: "سند هزینه یافت نشد." }, { status: 404 });
    }

    // Refund amount back to account
    if (existing.accountId) {
      const amt = Number(existing.amount) || 0;
      await db
        .update(accounts)
        .set({ balance: sql`${accounts.balance} + ${amt}` })
        .where(eq(accounts.id, existing.accountId));
    }

    await db.delete(expenses).where(eq(expenses.id, id));

    await logAuditEvent("DELETE", "expense", id, {
      title: existing.title,
      amount: existing.amount,
      accountId: existing.accountId,
    });

    return NextResponse.json({
      success: true,
      message: `سند هزینه «${existing.title}» با موفقیت ابطال شد و مبلغ آن به موجودی حساب بازگردانده گردید.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
