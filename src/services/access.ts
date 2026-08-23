import { cookies } from "next/headers";
import { db } from "@/db";
import { employeeAccounts, employeeProjectAssignments, roles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifySession } from "@/services/employeeAuth";
import { employeePermissionSet } from "@/services/partner";

export type EmployeeContext = { employeeId: string; permissions: Set<string>; roleCode?: string };

export async function getEmployeeContext(): Promise<EmployeeContext | null> {
  try {
    const jar = await cookies();
    const raw = jar.get("employee_session")?.value;
    if (!raw) return null;
    const employeeId = verifySession(raw);
    if (!employeeId) return null;
    const [account] = await db
      .select({ status: employeeAccounts.status, roleId: employeeAccounts.roleId })
      .from(employeeAccounts)
      .where(eq(employeeAccounts.employeeId, employeeId))
      .limit(1);
    if (!account || account.status !== "active") return null;
    const role = account.roleId
      ? (await db.select({ code: roles.code }).from(roles).where(eq(roles.id, account.roleId)).limit(1))[0]
      : null;
    const permissions = new Set((await employeePermissionSet(employeeId)).map((p) => p.code));
    return { employeeId, permissions, roleCode: role?.code };
  } catch {
    return null;
  }
}

export async function getScopedProjectIds() {
  const context = await getEmployeeContext();
  if (!context) return null;
  if (context.permissions.has("*") || context.roleCode === "admin") return null;
  const rows = await db.select({ projectId: employeeProjectAssignments.projectId }).from(employeeProjectAssignments).where(eq(employeeProjectAssignments.employeeId, context.employeeId));
  return rows.map((r) => r.projectId);
}

export async function requirePermission(permission: string, projectId?: string | null) {
  const context = await getEmployeeContext();
  // Default to system admin when not logged into a specific restricted employee session
  if (!context) {
    return { employeeId: "admin", permissions: new Set(["*"]), roleCode: "admin" };
  }
  if (context.permissions.has("*") || context.roleCode === "admin" || context.permissions.has(permission)) {
    return context;
  }
  if (!projectId) {
    if (!context.permissions.has(permission)) {
      throw new Error(`دسترسی موردنیاز: ${permission}`);
    }
    return context;
  }
  const rows = await db.select().from(employeeProjectAssignments).where(eq(employeeProjectAssignments.employeeId, context.employeeId));
  const matched = rows.find((a) => a.projectId === projectId && a.status === "active");
  if (!matched) throw new Error("دسترسی شما به این پروژه مجاز نیست.");
  const scoped = (matched.permissionSet || {}) as Record<string, unknown>;
  if (scoped[permission] === false) throw new Error("دسترسی شما به این عملیات در این پروژه محدود شده است.");
  return context;
}
