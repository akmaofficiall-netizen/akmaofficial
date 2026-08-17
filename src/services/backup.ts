import { db } from "@/db";
import {
  backups,
  projects,
  customers,
  employees,
  suppliers,
  rawMaterials,
  products,
  invoices,
  invoiceItems,
  payments,
  expenses,
  productionBatches,
  inventoryLedger,
  alerts,
  tasks,
  auditLogs,
  systemSettings
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { logAuditEvent } from "./audit";

/**
 * Creates a full JSON database backup snapshot
 */
export async function createFullSystemBackup() {
  const allProjects = await db.select().from(projects);
  const allCustomers = await db.select().from(customers);
  const allEmployees = await db.select().from(employees);
  const allSuppliers = await db.select().from(suppliers);
  const allRawMaterials = await db.select().from(rawMaterials);
  const allProducts = await db.select().from(products);
  const allInvoices = await db.select().from(invoices);
  const allInvoiceItems = await db.select().from(invoiceItems);
  const allPayments = await db.select().from(payments);
  const allExpenses = await db.select().from(expenses);
  const allProductionBatches = await db.select().from(productionBatches);
  const allInventoryLedger = await db.select().from(inventoryLedger);
  const allAlerts = await db.select().from(alerts);
  const allTasks = await db.select().from(tasks);
  const allSettings = await db.select().from(systemSettings);

  const dump = {
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    data: {
      projects: allProjects,
      customers: allCustomers,
      employees: allEmployees,
      suppliers: allSuppliers,
      rawMaterials: allRawMaterials,
      products: allProducts,
      invoices: allInvoices,
      invoiceItems: allInvoiceItems,
      payments: allPayments,
      expenses: allExpenses,
      productionBatches: allProductionBatches,
      inventoryLedger: allInventoryLedger,
      alerts: allAlerts,
      tasks: allTasks,
      settings: allSettings,
    },
  };

  const jsonString = JSON.stringify(dump);
  const sizeBytes = Buffer.byteLength(jsonString, "utf8");
  const checksum = `SHA256-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const filename = `backup_akma_v2_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;

  const [backupRecord] = await db
    .insert(backups)
    .values({
      filename,
      sizeBytes,
      checksum,
      status: "completed",
      backupData: dump as any,
    })
    .returning();

  await logAuditEvent("BACKUP", "system", backupRecord.id, { filename, sizeBytes, checksum });

  return backupRecord;
}

/**
 * Gets list of all system backups
 */
export async function getBackupsList() {
  return await db
    .select({
      id: backups.id,
      filename: backups.filename,
      sizeBytes: backups.sizeBytes,
      checksum: backups.checksum,
      status: backups.status,
      createdAt: backups.createdAt,
    })
    .from(backups)
    .orderBy(desc(backups.createdAt));
}
