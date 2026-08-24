import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { logAuditEvent } from "./audit";

const BACKUP_TABLES = [
  ["projects", schema.projects],
  ["customers", schema.customers],
  ["customerProjectMemberships", schema.customerProjectMemberships],
  ["customerHealthLogs", schema.customerHealthLogs],
  ["employees", schema.employees],
  ["employeeProjectMemberships", schema.employeeProjectMemberships],
  ["customerAssignments", schema.customerAssignments],
  ["roles", schema.roles],
  ["permissions", schema.permissions],
  ["rolePermissions", schema.rolePermissions],
  ["employeeAccounts", schema.employeeAccounts],
  ["employeeProjectAssignments", schema.employeeProjectAssignments],
  ["projectCompensations", schema.projectCompensations],
  ["projectTargets", schema.projectTargets],
  ["suppliers", schema.suppliers],
  ["rawMaterials", schema.rawMaterials],
  ["rawMaterialPriceHistory", schema.rawMaterialPriceHistory],
  ["products", schema.products],
  ["productRecipes", schema.productRecipes],
  ["projectProductPrices", schema.projectProductPrices],
  ["warehouses", schema.warehouses],
  ["inventoryLedger", schema.inventoryLedger],
  ["purchases", schema.purchases],
  ["purchaseItems", schema.purchaseItems],
  ["productionBatches", schema.productionBatches],
  ["productionBatchItems", schema.productionBatchItems],
  ["invoices", schema.invoices],
  ["invoiceItems", schema.invoiceItems],
  ["accounts", schema.accounts],
  ["payments", schema.payments],
  ["paymentAllocations", schema.paymentAllocations],
  ["commissionRules", schema.commissionRules],
  ["commissionLedger", schema.commissionLedger],
  ["payrollRecords", schema.payrollRecords],
  ["expenses", schema.expenses],
  ["consignments", schema.consignments],
  ["consignmentItems", schema.consignmentItems],
  ["alerts", schema.alerts],
  ["tasks", schema.tasks],
  ["auditLogs", schema.auditLogs],
  ["systemSettings", schema.systemSettings],
] as const;

export async function createFullSystemBackup() {
  const data: Record<string, unknown> = {};

  for (const [name, table] of BACKUP_TABLES) {
    try {
      data[name] = await db.select().from(table as any);
    } catch (e: any) {
      console.warn(`Skipping table ${name} during backup query:`, e.message);
      data[name] = [];
    }
  }

  const dump = {
    version: "3.5.0",
    timestamp: new Date().toISOString(),
    database: "akma",
    data,
  };

  const jsonString = JSON.stringify(dump);
  const buffer = Buffer.from(jsonString, "utf8");
  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
  const filename = `backup_akma_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;

  const backupDir = process.env.BACKUP_DIR || path.resolve(process.cwd(), "backups");
  let storagePath: string | null = null;
  try {
    await fs.mkdir(backupDir, { recursive: true });
    storagePath = path.join(backupDir, filename);
    await fs.writeFile(storagePath, buffer);
  } catch (error) {
    console.warn("Local disk backup file storage unavailable; keeping snapshot in database:", error);
  }

  const [record] = await db
    .insert(schema.backups)
    .values({
      filename,
      sizeBytes: buffer.byteLength,
      checksum,
      status: "completed",
      backupData: dump as any,
    })
    .returning();

  try {
    await logAuditEvent("BACKUP", "system", record.id, {
      filename,
      sizeBytes: buffer.byteLength,
      checksum,
      storagePath,
    });
  } catch (e) {
    console.warn("Audit log error on backup:", e);
  }

  return { ...record, storagePath };
}

export async function getBackupsList() {
  return db
    .select({
      id: schema.backups.id,
      filename: schema.backups.filename,
      sizeBytes: schema.backups.sizeBytes,
      checksum: schema.backups.checksum,
      status: schema.backups.status,
      createdAt: schema.backups.createdAt,
    })
    .from(schema.backups)
    .orderBy(desc(schema.backups.createdAt));
}

export async function getBackupById(id: string) {
  const [record] = await db.select().from(schema.backups).where(eq(schema.backups.id, id)).limit(1);
  return record;
}

function sanitizeRowForTable(table: any, row: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(row)) {
    if (val === undefined) continue;

    const col = table[key];
    const isDateCol =
      col &&
      (col.dataType === "date" ||
        col.columnType === "PgTimestamp" ||
        col.columnType === "PgDate");

    if (isDateCol) {
      if (val === null || val === "") {
        clean[key] = null;
      } else if (val instanceof Date) {
        clean[key] = val;
      } else {
        const parsed = new Date(val as string | number);
        clean[key] = isNaN(parsed.getTime()) ? null : parsed;
      }
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

export async function restoreFullSystemBackup(dump: any) {
  if (!dump || !dump.data || typeof dump.data !== "object") {
    throw new Error("فرمت فایل پشتیبان نامعتبر است (ساختار data یا جداول یافت نشد).");
  }

  const { data } = dump;
  const restoredStats: Record<string, number> = {};

  const tableNames = [
    "audit_logs",
    "tasks",
    "alerts",
    "consignment_items",
    "consignments",
    "expenses",
    "payroll_records",
    "commission_ledger",
    "commission_rules",
    "payment_allocations",
    "payments",
    "accounts",
    "invoice_items",
    "invoices",
    "production_batch_items",
    "production_batches",
    "purchase_items",
    "purchases",
    "inventory_ledger",
    "warehouses",
    "project_product_prices",
    "product_recipes",
    "products",
    "raw_material_price_history",
    "raw_materials",
    "suppliers",
    "project_targets",
    "project_compensations",
    "employee_project_assignments",
    "employee_accounts",
    "role_permissions",
    "permissions",
    "roles",
    "customer_assignments",
    "employee_project_memberships",
    "employees",
    "customer_health_logs",
    "customer_project_memberships",
    "customers",
    "projects",
    "system_settings",
  ];

  // 1. Truncate all tables cleanly with CASCADE
  try {
    const truncateSql = `TRUNCATE ${tableNames.map((t) => `"${t}"`).join(", ")} CASCADE;`;
    await db.execute(sql.raw(truncateSql));
  } catch (e: any) {
    console.warn("Truncate cascade warning, falling back to individual deletes:", e.message);
    const reverseTables = [...BACKUP_TABLES].reverse();
    for (const [name, table] of reverseTables) {
      try {
        await db.delete(table as any);
      } catch (err: any) {
        console.warn(`Table wipe note on ${name}:`, err.message);
      }
    }
  }

  // 2. Insert records in forward order (parents first)
  for (const [name, table] of BACKUP_TABLES) {
    const rows = data[name];
    if (Array.isArray(rows) && rows.length > 0) {
      const chunkSize = 50;
      let count = 0;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const sanitizedChunk = chunk.map((r) => sanitizeRowForTable(table, r));
        await db.insert(table as any).values(sanitizedChunk).onConflictDoNothing();
        count += sanitizedChunk.length;
      }
      restoredStats[name] = count;
    } else {
      restoredStats[name] = 0;
    }
  }

  try {
    await logAuditEvent("RESTORE", "system", "all", {
      timestamp: new Date().toISOString(),
      restoredTables: Object.keys(restoredStats).length,
    });
  } catch (e) {
    console.warn("Audit log error on restore:", e);
  }

  return { success: true, restoredStats };
}

export async function restoreBackupById(id: string) {
  const backup = await getBackupById(id);
  if (!backup) {
    throw new Error("پشتیبان مورد نظر یافت نشد.");
  }
  if (!backup.backupData) {
    throw new Error("داده‌های پشتیبان در رکورد این فایل موجود نمی‌باشد.");
  }
  return restoreFullSystemBackup(backup.backupData);
}
