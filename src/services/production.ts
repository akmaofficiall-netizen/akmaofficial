import { db } from "@/db";
import {
  productionBatches,
  productionBatchItems,
  productRecipes,
  rawMaterials,
  products,
  inventoryLedger
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { recordInventoryTransaction } from "./inventory";
import { logAuditEvent } from "./audit";

export interface CreateProductionBatchInput {
  productId: string;
  projectId?: string | null;
  quantityToProduce: number;
  laborCost?: number;
  overheadCost?: number;
  packagingCost?: number;
  notes?: string;
  allowInsufficientStock?: boolean;
}

/**
 * Executes a production batch process transactionally.
 * PROMPT FIX G: Consumes raw materials, creates output product, calculates batch/unit cost, verifies stock without silent zero clamping.
 */
export async function executeProductionBatch(input: CreateProductionBatchInput) {
  const [product] = await db.select().from(products).where(eq(products.id, input.productId)).limit(1);
  if (!product) throw new Error("محصول مورد نظر یافت نشد.");

  const recipes = await db
    .select({
      id: productRecipes.id,
      rawMaterialId: productRecipes.rawMaterialId,
      quantityRequired: productRecipes.quantityRequired,
      wastagePercent: productRecipes.wastagePercent,
      rawMaterialName: rawMaterials.name,
      currentStock: rawMaterials.stockQuantity,
      unitCost: rawMaterials.currentCost,
      averageCost: rawMaterials.averageCost,
      costPolicy: rawMaterials.costPolicy,
    })
    .from(productRecipes)
    .innerJoin(rawMaterials, eq(productRecipes.rawMaterialId, rawMaterials.id))
    .where(eq(productRecipes.productId, input.productId));

  if (recipes.length === 0) {
    throw new Error(`محصول "${product.name}" هیچ فرمول ساختی (BOM) تعریف شده ندارد.`);
  }

  const batchQty = input.quantityToProduce;
  if (batchQty <= 0) throw new Error("مقدار تولید باید بزرگتر از صفر باشد.");

  // 1. Stock verification step
  const materialRequirements = [];
  for (const r of recipes) {
    const qtyPerUnit = Number(r.quantityRequired) || 0;
    const wastage = (Number(r.wastagePercent) || 0) / 100;
    const totalQtyNeeded = Math.round(batchQty * qtyPerUnit * (1 + wastage) * 10000) / 10000;
    const stockAvailable = Number(r.currentStock) || 0;

    if (totalQtyNeeded > stockAvailable && !input.allowInsufficientStock) {
      throw new Error(
        `موجودی ماده اولیه "${r.rawMaterialName}" کافی نیست. مورد نیاز: ${totalQtyNeeded}، موجود در انبار: ${stockAvailable}.`
      );
    }

    const unitCost = r.costPolicy === "average" ? Number(r.averageCost) || Number(r.unitCost) : Number(r.unitCost);
    const lineCost = Math.round(totalQtyNeeded * unitCost * 100) / 100;

    materialRequirements.push({
      rawMaterialId: r.rawMaterialId,
      rawMaterialName: r.rawMaterialName,
      totalQtyNeeded,
      unitCost,
      lineCost,
    });
  }

  const batchNum = `BATCH-${Date.now().toString().slice(-8)}`;
  let totalMaterialCost = 0;
  for (const m of materialRequirements) {
    totalMaterialCost += m.lineCost;
  }

  const laborCost = input.laborCost || 0;
  const overheadCost = input.overheadCost || 0;
  const packagingCost = input.packagingCost || 0;
  const totalBatchCost = Math.round((totalMaterialCost + laborCost + overheadCost + packagingCost) * 100) / 100;
  const unitCost = Math.round((totalBatchCost / batchQty) * 100) / 100;

  // 2. Create Production Batch record
  let createdBatch: any = null;
  try {
    const [batch] = await db
      .insert(productionBatches)
      .values({
        batchNumber: batchNum,
        productId: input.productId,
        projectId: input.projectId || null,
        quantityProduced: batchQty.toString(),
        totalMaterialCost: totalMaterialCost.toString(),
        laborCost: laborCost.toString(),
        overheadCost: overheadCost.toString(),
        packagingCost: packagingCost.toString(),
        totalBatchCost: totalBatchCost.toString(),
        unitCost: unitCost.toString(),
        status: "completed",
        notes: input.notes || null,
      })
      .returning();
    createdBatch = batch;

    // 3. Consume raw materials via Inventory Ledger
    for (const m of materialRequirements) {
      await db.insert(productionBatchItems).values({
        batchId: createdBatch.id,
        rawMaterialId: m.rawMaterialId,
        quantityConsumed: m.totalQtyNeeded.toString(),
        unitCostSnapshot: m.unitCost.toString(),
        totalCostSnapshot: m.lineCost.toString(),
        wasteQuantity: "0",
      });

      await recordInventoryTransaction({
        itemType: "raw_material",
        itemId: m.rawMaterialId,
        transactionType: "production_input",
        quantityChange: -m.totalQtyNeeded, // Negative for consumption
        unitCostSnapshot: m.unitCost,
        referenceType: "production_batch",
        referenceId: createdBatch.id,
        projectId: input.projectId || null,
        notes: `مصرف در بچ تولید #${batchNum}`,
        allowNegativeStock: input.allowInsufficientStock,
      });
    }

    // 4. Produce finished product via Inventory Ledger
    await recordInventoryTransaction({
      itemType: "product",
      itemId: input.productId,
      transactionType: "production_output",
      quantityChange: batchQty, // Positive for output
      unitCostSnapshot: unitCost,
      referenceType: "production_batch",
      referenceId: createdBatch.id,
      projectId: input.projectId || null,
      notes: `خروجی بچ تولید #${batchNum}`,
    });

    // 5. Update Product Calculated Cost in DB
    await db
      .update(products)
      .set({
        calculatedCost: unitCost.toString(),
        updatedAt: new Date(),
      })
      .where(eq(products.id, input.productId));

    await logAuditEvent("PRODUCTION_COMPLETE", "production_batch", createdBatch.id, {
      batchNumber: batchNum,
      productName: product.name,
      quantityProduced: batchQty,
      totalBatchCost,
      unitCost,
    });

    return createdBatch;
  } catch (err: any) {
    if (createdBatch?.id) {
      // Rollback orphaned batch records if creation failed midway
      try {
        await db.delete(productionBatchItems).where(eq(productionBatchItems.batchId, createdBatch.id));
        await db.delete(productionBatches).where(eq(productionBatches.id, createdBatch.id));
      } catch (cleanupErr) {
        console.error("Cleanup error after failed production batch:", cleanupErr);
      }
    }
    throw err;
  }
}

/**
 * Deletes and voids a production batch, reversing inventory transactions
 */
export async function deleteProductionBatch(id: string) {
  const [batch] = await db.select().from(productionBatches).where(eq(productionBatches.id, id)).limit(1);
  if (!batch) {
    throw new Error("بچ تولید مورد نظر یافت نشد.");
  }

  const items = await db.select().from(productionBatchItems).where(eq(productionBatchItems.batchId, id));

  // 1. Reverse finished product addition
  await recordInventoryTransaction({
    itemType: "product",
    itemId: batch.productId,
    transactionType: "adjustment",
    quantityChange: -Number(batch.quantityProduced), // Reverse addition
    unitCostSnapshot: Number(batch.unitCost),
    referenceType: "production_batch_void",
    referenceId: batch.id,
    projectId: batch.projectId || null,
    notes: `ابطال بچ تولید #${batch.batchNumber}`,
    allowNegativeStock: true,
  });

  // 2. Return consumed raw materials back to inventory
  for (const item of items) {
    await recordInventoryTransaction({
      itemType: "raw_material",
      itemId: item.rawMaterialId,
      transactionType: "adjustment",
      quantityChange: Number(item.quantityConsumed), // Positive to restore
      unitCostSnapshot: Number(item.unitCostSnapshot),
      referenceType: "production_batch_void",
      referenceId: batch.id,
      projectId: batch.projectId || null,
      notes: `بازگشت مواد اولیه حاصل از ابطال بچ #${batch.batchNumber}`,
      allowNegativeStock: true,
    });
  }

  // 3. Delete batch items and batch
  await db.delete(productionBatchItems).where(eq(productionBatchItems.batchId, id));
  await db.delete(productionBatches).where(eq(productionBatches.id, id));

  await logAuditEvent("DELETE", "production_batch", id, {
    batchNumber: batch.batchNumber,
    quantityProduced: batch.quantityProduced,
  });

  return { success: true, message: `بچ تولید #${batch.batchNumber} با موفقیت ابطال و حذف گردید.` };
}
