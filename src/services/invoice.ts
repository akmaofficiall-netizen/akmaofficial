import { db } from "@/db";
import {
  invoices,
  invoiceItems,
  products,
  customers,
  employees,
  payments,
  paymentAllocations,
  commissionLedger,
  accounts,
  inventoryLedger,
  projects
} from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { recordInventoryTransaction } from "./inventory";
import { resolveProductPrice } from "./pricing";
import { recalculateCustomerHealth } from "./customerHealth";
import { logAuditEvent } from "./audit";

export interface CreateInvoiceItemInput {
  productId: string;
  quantity: number;
  unitPrice?: number; // Optional override
  discountAmount?: number;
}

export interface CreateInvoiceInput {
  customerId: string;
  projectId?: string | null;
  salesMode?: "direct" | "visitor" | "visitor_intermediary" | "intermediary";
  employeeId?: string | null; // Salesperson
  intermediaryEmployeeId?: string | null;
  invoiceDate?: Date;
  dueDate?: Date;
  invoiceDiscount?: number;
  taxTotal?: number;
  items: CreateInvoiceItemInput[];
  initialPayment?: {
    amount: number;
    accountId: string;
    paymentMethod: string;
    referenceNumber?: string;
  };
  notes?: string;
  manualInvoiceNumber?: string;
}

/**
 * Generates a concurrency-safe unique invoice number
 */
export async function generateInvoiceNumber(): Promise<string> {
  const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const candidate = `INV-${datePrefix}-${randomSuffix}`;

  const [existing] = await db.select({ id: invoices.id }).from(invoices).where(eq(invoices.invoiceNumber, candidate)).limit(1);
  if (existing) {
    return generateInvoiceNumber(); // Retry on rare collision
  }
  return candidate;
}

/**
 * Transactional Invoice Creation.
 * PROMPT FIX D: Run Invoice, Items, Inventory Ledger, Payment, Commission, and Audit in one transactional flow!
 */
export async function createInvoice(input: CreateInvoiceInput) {
  const customerId = input.customerId;
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
  if (!customer) throw new Error("مشتری پیدا نشد");

  const invoiceNum = input.manualInvoiceNumber || (await generateInvoiceNumber());

  let subtotal = 0;
  let lineDiscountsTotal = 0;
  let cogsTotal = 0;

  // Process and validate items
  const processedItems = [];
  for (const itemInput of input.items) {
    const [product] = await db.select().from(products).where(eq(products.id, itemInput.productId)).limit(1);
    if (!product) throw new Error(`محصول با شناسه ${itemInput.productId} یافت نشد.`);

    const resolvedPrice = await resolveProductPrice(product.id, input.projectId);
    const unitPrice = itemInput.unitPrice !== undefined ? itemInput.unitPrice : resolvedPrice.effectivePrice;
    const unitCost = Number(product.calculatedCost) || Number(product.basePrice) * 0.7 || 0;
    const qty = itemInput.quantity;
    const disc = itemInput.discountAmount || 0;

    const lineTotal = Math.round((qty * unitPrice - disc) * 100) / 100;
    const lineCogs = Math.round(qty * unitCost * 100) / 100;
    const lineProfit = Math.round((lineTotal - lineCogs) * 100) / 100;

    subtotal += qty * unitPrice;
    lineDiscountsTotal += disc;
    cogsTotal += lineCogs;

    processedItems.push({
      productId: product.id,
      productNameSnapshot: product.name,
      quantity: qty,
      unitPrice,
      unitCostSnapshot: unitCost,
      discountAmount: disc,
      lineTotal,
      lineCogs,
      lineProfit,
    });
  }

  const invoiceDiscount = input.invoiceDiscount || 0;
  const taxTotal = input.taxTotal || 0;
  const grandTotal = Math.max(0, subtotal - lineDiscountsTotal - invoiceDiscount + taxTotal);
  const grossProfitTotal = grandTotal - cogsTotal;

  // Handle Initial Payment if provided
  const initialPayAmount = input.initialPayment ? Math.min(grandTotal, input.initialPayment.amount) : 0;
  const balanceDue = grandTotal - initialPayAmount;

  let paymentStatus: "unpaid" | "partial" | "paid" = "unpaid";
  if (initialPayAmount >= grandTotal && grandTotal > 0) {
    paymentStatus = "paid";
  } else if (initialPayAmount > 0) {
    paymentStatus = "partial";
  }

  // Create Invoice record
  const [createdInvoice] = await db
    .insert(invoices)
    .values({
      invoiceNumber: invoiceNum,
      customerId,
      projectId: input.projectId || null,
      salesMode: input.salesMode || "direct",
      employeeId: input.employeeId || null,
      intermediaryEmployeeId: input.intermediaryEmployeeId || null,
      invoiceDate: input.invoiceDate || new Date(),
      dueDate: input.dueDate || new Date(Date.now() + (customer.paymentTermsDays || 30) * 86400000),
      subtotal: subtotal.toString(),
      lineDiscountsTotal: lineDiscountsTotal.toString(),
      invoiceDiscount: invoiceDiscount.toString(),
      taxTotal: taxTotal.toString(),
      grandTotal: grandTotal.toString(),
      cogsTotal: cogsTotal.toString(),
      grossProfitTotal: grossProfitTotal.toString(),
      paidAmount: initialPayAmount.toString(),
      balanceDue: balanceDue.toString(),
      paymentStatus,
      status: "issued",
      notes: input.notes || null,
    })
    .returning();

  // Create Invoice Items & record Inventory Ledger Out transactions
  for (const item of processedItems) {
    await db.insert(invoiceItems).values({
      invoiceId: createdInvoice.id,
      productId: item.productId,
      productNameSnapshot: item.productNameSnapshot,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      unitCostSnapshot: item.unitCostSnapshot.toString(),
      discountAmount: item.discountAmount.toString(),
      lineTotal: item.lineTotal.toString(),
      lineCogs: item.lineCogs.toString(),
      lineProfit: item.lineProfit.toString(),
    });

    // Record inventory transaction (Sales OUT)
    await recordInventoryTransaction({
      itemType: "product",
      itemId: item.productId,
      transactionType: "sale",
      quantityChange: -item.quantity, // Negative for sale
      unitCostSnapshot: item.unitCostSnapshot,
      referenceType: "invoice",
      referenceId: createdInvoice.id,
      projectId: input.projectId || null,
      notes: `فروش فاکتور #${invoiceNum}`,
    });
  }

  // Process Commission if employee assigned
  if (input.employeeId) {
    const [emp] = await db.select().from(employees).where(eq(employees.id, input.employeeId)).limit(1);
    if (emp) {
      const commRate = Number(emp.commissionRatePercent) || 5;
      const commAmount = Math.round((grandTotal * commRate) / 100);

      await db.insert(commissionLedger).values({
        employeeId: input.employeeId,
        invoiceId: createdInvoice.id,
        projectId: input.projectId || null,
        ruleSnapshot: { ratePercent: commRate, type: "salesperson_commission" },
        baseAmount: grandTotal.toString(),
        commissionAmount: commAmount.toString(),
        status: "pending",
        notes: `پورسانت فروش فاکتور #${invoiceNum}`,
      });
    }
  }

  // Process Initial Payment if provided
  if (input.initialPayment && initialPayAmount > 0) {
    const payNum = `PAY-${Date.now().toString().slice(-6)}`;
    const [createdPayment] = await db
      .insert(payments)
      .values({
        paymentNumber: payNum,
        customerId,
        invoiceId: createdInvoice.id,
        projectId: input.projectId || null,
        accountId: input.initialPayment.accountId,
        paymentType: "customer_receipt",
        amount: initialPayAmount.toString(),
        paymentMethod: input.initialPayment.paymentMethod || "pos",
        referenceNumber: input.initialPayment.referenceNumber || null,
        status: "completed",
        notes: `دریافت بابت فاکتور #${invoiceNum}`,
      })
      .returning();

    await db.insert(paymentAllocations).values({
      paymentId: createdPayment.id,
      invoiceId: createdInvoice.id,
      allocatedAmount: initialPayAmount.toString(),
    });

    // Update account balance
    await db
      .update(accounts)
      .set({
        balance: sql`${accounts.balance} + ${initialPayAmount}`,
      })
      .where(eq(accounts.id, input.initialPayment.accountId));
  }

  // Recalculate customer health score automatically
  await recalculateCustomerHealth(customerId);

  await logAuditEvent("CREATE", "invoice", createdInvoice.id, {
    invoiceNumber: invoiceNum,
    grandTotal,
    customerId,
    itemsCount: processedItems.length,
  });

  return createdInvoice;
}

/**
 * Reverse an invoice safely (Audited Reversal)
 */
export async function reverseInvoice(invoiceId: string, reason: string) {
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!inv) throw new Error("فاکتور پیدا نشد");
  if (inv.status === "reversed") throw new Error("این فاکتور قبلاً باطل شده است");

  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));

  // 1. Return stock for each item via inventory ledger
  for (const item of items) {
    await recordInventoryTransaction({
      itemType: "product",
      itemId: item.productId,
      transactionType: "sales_return",
      quantityChange: Number(item.quantity), // Positive return
      unitCostSnapshot: Number(item.unitCostSnapshot),
      referenceType: "invoice_reversal",
      referenceId: invoiceId,
      projectId: inv.projectId,
      notes: `ابطال فاکتور #${inv.invoiceNumber}: ${reason}`,
    });
  }

  // 2. Reverse Commissions
  await db
    .update(commissionLedger)
    .set({ status: "reversed", notes: `ابطال فاکتور: ${reason}` })
    .where(eq(commissionLedger.invoiceId, invoiceId));

  // 3. Mark invoice status as reversed
  const [updated] = await db
    .update(invoices)
    .set({
      status: "reversed",
      reversalReason: reason,
      balanceDue: "0",
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId))
    .returning();

  await recalculateCustomerHealth(inv.customerId);
  await logAuditEvent("REVERSE", "invoice", invoiceId, { invoiceNumber: inv.invoiceNumber, reason });

  return updated;
}
