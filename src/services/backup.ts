import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { logAuditEvent } from "./audit";

const BACKUP_TABLES = [
  ["projects", schema.projects], ["customers", schema.customers], ["customerProjectMemberships", schema.customerProjectMemberships],
  ["customerHealthLogs", schema.customerHealthLogs], ["employees", schema.employees], ["employeeProjectMemberships", schema.employeeProjectMemberships],
  ["customerAssignments", schema.customerAssignments], ["roles", schema.roles], ["permissions", schema.permissions], ["rolePermissions", schema.rolePermissions],
  ["employeeAccounts", schema.employeeAccounts], ["employeeProjectAssignments", schema.employeeProjectAssignments], ["projectCompensations", schema.projectCompensations], ["projectTargets", schema.projectTargets],
  ["suppliers", schema.suppliers], ["rawMaterials", schema.rawMaterials], ["rawMaterialPriceHistory", schema.rawMaterialPriceHistory], ["products", schema.products],
  ["productRecipes", schema.productRecipes], ["projectProductPrices", schema.projectProductPrices], ["warehouses", schema.warehouses], ["inventoryLedger", schema.inventoryLedger],
  ["purchases", schema.purchases], ["purchaseItems", schema.purchaseItems], ["productionBatches", schema.productionBatches], ["productionBatchItems", schema.productionBatchItems],
  ["invoices", schema.invoices], ["invoiceItems", schema.invoiceItems], ["accounts", schema.accounts], ["payments", schema.payments], ["paymentAllocations", schema.paymentAllocations],
  ["commissionRules", schema.commissionRules], ["commissionLedger", schema.commissionLedger], ["payrollRecords", schema.payrollRecords], ["expenses", schema.expenses],
  ["consignments", schema.consignments], ["consignmentItems", schema.consignmentItems], ["alerts", schema.alerts], ["tasks", schema.tasks], ["auditLogs", schema.auditLogs], ["systemSettings", schema.systemSettings],
] as const;

export async function createFullSystemBackup() {
  const data: Record<string, unknown> = {};
  for (const [name, table] of BACKUP_TABLES) data[name] = await db.select().from(table as any);
  const dump = { version: "3.0.0", timestamp: new Date().toISOString(), database: "akma", data };
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
    console.warn("Backup file storage unavailable; keeping snapshot in database:", error);
  }
  const [record] = await db.insert(schema.backups).values({
    filename, sizeBytes: buffer.byteLength, checksum, status: "completed", backupData: dump as any,
  }).returning();
  await logAuditEvent("BACKUP", "system", record.id, { filename, sizeBytes: buffer.byteLength, checksum, storagePath });
  return { ...record, storagePath };
}

export async function getBackupsList() {
  return db.select({ id: schema.backups.id, filename: schema.backups.filename, sizeBytes: schema.backups.sizeBytes, checksum: schema.backups.checksum, status: schema.backups.status, createdAt: schema.backups.createdAt }).from(schema.backups).orderBy(desc(schema.backups.createdAt));
}

export async function getBackupById(id: string) {
  const [record] = await db.select().from(schema.backups).where(eq(schema.backups.id, id)).limit(1);
  return record;
}
