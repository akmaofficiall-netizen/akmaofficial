import { cookies } from "next/headers";
import { db } from "@/db";
import { employeeAccounts, employeeProjectAssignments, roles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifySession } from "@/services/employeeAuth";
import { employeePermissionSet } from "@/services/partner";

export type EmployeeContext = { employeeId: string; permissions: Set<string>; roleCode?: string };

export async function getEmployeeContext(): Promise<EmployeeContext | null> {
  const jar = await cookies();
  const raw = jar.get("employee_session")?.value;
  if (!raw) return null;
  const employeeId = verifySession(raw);
  if (!employeeId) throw new Error("نشست کاربر منقضی یا نامعتبر است.");
  const [account] = await db
    .select({ status: employeeAccounts.status, roleId: employeeAccounts.roleId })
    .from(employeeAccounts)
    .where(eq(employeeAccounts.employeeId, employeeId))
    .limit(1);
  if (!account || account.status !== "active") throw new Error("حساب کاربر غیرفعال است.");
  const role = account.roleId
    ? (await db.select({ code: roles.code }).from(roles).where(eq(roles.id, account.roleId)).limit(1))[0]
    : null;
  const permissions = new Set((await employeePermissionSet(employeeId)).map((p) => p.code));
  return { employeeId, permissions, roleCode: role?.code };
}

export async function getScopedProjectIds() {
  const context = await getEmployeeContext();
  if (!context) return null;
  const rows = await db.select({ projectId: employeeProjectAssignments.projectId }).from(employeeProjectAssignments).where(eq(employeeProjectAssignments.employeeId, context.employeeId));
  return rows.map((r) => r.projectId);
}

export async function requirePermission(permission: string, projectId?: string | null) {
  const context = await getEmployeeContext();
  if (!context) throw new Error("برای این بخش باید وارد حساب کاربری شوید.");
  if (!(context.permissions.has("*") || context.permissions.has(permission))) throw new Error(`دسترسی موردنیاز: ${permission}`);
  if (context.permissions.has("*")) return context;
  if (!projectId) return context;
  const rows = await db.select().from(employeeProjectAssignments).where(eq(employeeProjectAssignments.employeeId, context.employeeId));
  const matched = rows.find((a) => a.projectId === projectId && a.status === "active");
  if (!matched) throw new Error("دسترسی شما به این پروژه مجاز نیست.");
  const scoped = (matched.permissionSet || {}) as Record<string, unknown>;
  if (scoped[permission] === false) throw new Error("دسترسی شما به این عملیات در این پروژه محدود شده است.");
  return context;
}
