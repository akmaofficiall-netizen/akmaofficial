import { db } from "@/db";
import { employees, customers, tasks, auditLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { logAuditEvent } from "./audit";

export interface OffboardEmployeeInput {
  employeeId: string;
  replacementEmployeeId?: string | null;
  transferReason?: string;
}

/**
 * Offboards an employee safely without destroying historical sales/commissions.
 * PROMPT REQUIREMENT 9: Transfer customers & tasks to replacement visitor, update status to transferred/inactive, write audit log.
 */
export async function offboardEmployee(input: OffboardEmployeeInput) {
  const [emp] = await db.select().from(employees).where(eq(employees.id, input.employeeId)).limit(1);
  if (!emp) throw new Error("کارمند/ویزیتور یافت نشد");

  let replacementName = "بدون ویزیتور جایگزین (اورفان)";
  if (input.replacementEmployeeId) {
    const [replacement] = await db.select().from(employees).where(eq(employees.id, input.replacementEmployeeId)).limit(1);
    if (replacement) {
      replacementName = replacement.name;
    }
  }

  // 1. Reassign assigned customers to replacement employee
  const assignedCusts = await db
    .select({ id: customers.id, name: customers.name })
    .from(customers)
    .where(eq(customers.assignedEmployeeId, input.employeeId));

  if (assignedCusts.length > 0) {
    await db
      .update(customers)
      .set({
        assignedEmployeeId: input.replacementEmployeeId || null,
        updatedAt: new Date(),
      })
      .where(eq(customers.assignedEmployeeId, input.employeeId));
  }

  // 2. Reassign unfinished tasks
  const openTasks = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.assignedEmployeeId, input.employeeId), eq(tasks.status, "open")));

  if (openTasks.length > 0) {
    await db
      .update(tasks)
      .set({
        assignedEmployeeId: input.replacementEmployeeId || null,
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.assignedEmployeeId, input.employeeId), eq(tasks.status, "open")));
  }

  // 3. Mark employee status as transferred/archived
  const [updatedEmp] = await db
    .update(employees)
    .set({
      status: "transferred",
      notes: `خروج/انتقال مسئولیت‌ها به ${replacementName}. علت: ${input.transferReason || "انتقال سازمانی"}. ${emp.notes || ""}`,
      updatedAt: new Date(),
    })
    .where(eq(employees.id, input.employeeId))
    .returning();

  await logAuditEvent("OFFBOARD", "employee", input.employeeId, {
    employeeName: emp.name,
    transferredCustomersCount: assignedCusts.length,
    transferredTasksCount: openTasks.length,
    replacementEmployeeId: input.replacementEmployeeId,
    replacementName,
    reason: input.transferReason,
  });

  return {
    employee: updatedEmp,
    transferredCustomersCount: assignedCusts.length,
    transferredTasksCount: openTasks.length,
    replacementName,
  };
}
