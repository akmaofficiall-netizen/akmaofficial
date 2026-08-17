import { cookies, headers } from "next/headers";
import { db } from "@/db";
import { employeeAccounts, employeeProjectAssignments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifySession } from "@/services/employeeAuth";
import { employeePermissionSet } from "@/services/partner";

export type EmployeeContext = { employeeId: string; permissions: Set<string> };

export async function getEmployeeContext(): Promise<EmployeeContext | null> {
  const requestHeaders = await headers();
  const referer = requestHeaders.get("referer") || "";
  // The management panel and the employee panel share the same origin.
  // A stale employee_session cookie must never turn an admin request into an employee request.
  // Employee requests normally originate from /employee-* routes and continue to use the
  // employee session + permission checks below.
  const pathname = (() => {
    try { return new URL(referer).pathname; } catch { return referer; }
  })();
  const isAdminPanelRequest = pathname === "/admin" || pathname.startsWith("/admin/");
  if (isAdminPanelRequest) return null;

  const jar = await cookies();
  const raw = jar.get("employee_session")?.value;
  if (!raw) return null; // Admin panel is still authenticated by its existing mechanism.
  const employeeId = verifySession(raw);
  if (!employeeId) throw new Error("نشست همکار منقضی یا نامعتبر است.");
  const [account] = await db.select({ status: employeeAccounts.status }).from(employeeAccounts).where(eq(employeeAccounts.employeeId, employeeId)).limit(1);
  if (!account || account.status !== "active") throw new Error("حساب همکار غیرفعال است.");
  const permissions = new Set((await employeePermissionSet(employeeId)).map((p) => p.code));
  return { employeeId, permissions };
}

export async function getScopedProjectIds() {
  const context = await getEmployeeContext();
  if (!context) return null;
  const rows = await db.select({ projectId: employeeProjectAssignments.projectId }).from(employeeProjectAssignments).where(eq(employeeProjectAssignments.employeeId, context.employeeId));
  return rows.map((r) => r.projectId);
}

export async function requirePermission(permission: string, projectId?: string | null) {
  const context = await getEmployeeContext();
  if (!context) return null;
  if (!(context.permissions.has("*") || context.permissions.has(permission))) throw new Error(`دسترسی موردنیاز: ${permission}`);
  if (!projectId) return context;
  const rows = await db.select().from(employeeProjectAssignments).where(eq(employeeProjectAssignments.employeeId, context.employeeId));
  const matched = rows.find((a) => a.projectId === projectId && a.status === "active");
  if (!matched) throw new Error("دسترسی شما به این پروژه مجاز نیست.");
  const scoped = (matched.permissionSet || {}) as Record<string, unknown>;
  if (scoped[permission] === false) throw new Error("دسترسی شما به این عملیات در این پروژه محدود شده است.");
  return context;
}
