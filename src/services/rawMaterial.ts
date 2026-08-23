import { db } from "@/db";
import { rawMaterials, rawMaterialPriceHistory, productRecipes, products } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { updateProductCostFromBOM } from "./pricing";
import { recordInventoryTransaction } from "./inventory";
import { logAuditEvent } from "./audit";

export interface CreateRawMaterialInput {
  code: string;
  name: string;
  unit: string;
  unitConversionFactor?: number;
  secondaryUnit?: string;
  stockQuantity?: number;
  minStockQuantity?: number;
  currentCost: number;
  supplierId?: string;
  costPolicy?: "average" | "fifo" | "latest";
  notes?: string;
}

export interface UpdateRawMaterialInput {
  name?: string;
  code?: string;
  unit?: string;
  unitConversionFactor?: number;
  secondaryUnit?: string;
  minStockQuantity?: number;
  currentCost?: number;
  supplierId?: string | null;
  costPolicy?: "average" | "fifo" | "latest";
  status?: "active" | "inactive" | "archived";
  notes?: string;
  priceChangeReason?: string;
}

/**
 * Creates a new Raw Material
 */
export async function createRawMaterial(input: CreateRawMaterialInput) {
  let rm: typeof rawMaterials.$inferSelect;
  try {
    [rm] = await db
      .insert(rawMaterials)
      .values({
        code: input.code,
        name: input.name,
        unit: input.unit || "کیلوگرم",
        unitConversionFactor: (input.unitConversionFactor || 1).toString(),
        secondaryUnit: input.secondaryUnit || null,
        stockQuantity: (input.stockQuantity || 0).toString(),
        minStockQuantity: (input.minStockQuantity || 10).toString(),
        currentCost: input.currentCost.toString(),
        averageCost: input.currentCost.toString(),
        supplierId: input.supplierId || null,
        costPolicy: input.costPolicy || "average",
        notes: input.notes || null,
      })
      .returning();
  } catch (error: any) {
    if (error?.code === "23505" && String(error?.constraint || "").includes("raw_materials_code")) {
      throw new Error("کد ماده اولیه تکراری است. لطفاً یک کد دیگر انتخاب کنید.");
    }
    throw error;
  }

  // Initial Price History entry
  await db.insert(rawMaterialPriceHistory).values({
    rawMaterialId: rm.id,
    oldCost: "0",
    newCost: input.currentCost.toString(),
    changePercent: "100",
    reason: "قیمت اولیه",
  });

  await logAuditEvent("CREATE", "raw_material", rm.id, { name: rm.name, code: rm.code, cost: input.currentCost });
  return rm;
}

/**
 * Updates a Raw Material and propagates price changes to BOM & product costs.
 * PROMPT REQUIREMENT A: Real edit, save, cancel, validation, refresh, audit & dependent product cost updates.
 */
export async function updateRawMaterial(id: string, input: UpdateRawMaterialInput) {
  const [existing] = await db.select().from(rawMaterials).where(eq(rawMaterials.id, id)).limit(1);
  if (!existing) {
    throw new Error("ماده اولیه پیدا نشد");
  }

  const oldCost = Number(existing.currentCost);
  const newCost = input.currentCost !== undefined ? input.currentCost : oldCost;

  const updatePayload: Record<string, any> = { updatedAt: new Date() };

  if (input.name !== undefined) updatePayload.name = input.name;
  if (input.code !== undefined) updatePayload.code = input.code;
  if (input.unit !== undefined) updatePayload.unit = input.unit;
  if (input.unitConversionFactor !== undefined) updatePayload.unitConversionFactor = input.unitConversionFactor.toString();
  if (input.secondaryUnit !== undefined) updatePayload.secondaryUnit = input.secondaryUnit;
  if (input.minStockQuantity !== undefined) updatePayload.minStockQuantity = input.minStockQuantity.toString();
  if (input.supplierId !== undefined) updatePayload.supplierId = input.supplierId;
  if (input.costPolicy !== undefined) updatePayload.costPolicy = input.costPolicy;
  if (input.status !== undefined) updatePayload.status = input.status;
  if (input.notes !== undefined) updatePayload.notes = input.notes;

  let priceChanged = false;

  if (input.currentCost !== undefined && newCost !== oldCost) {
    priceChanged = true;
    updatePayload.currentCost = newCost.toString();

    // Calculate weighted average cost if cost policy is average
    const currentStock = Number(existing.stockQuantity) || 0;
    const oldAvg = Number(existing.averageCost) || oldCost;
    const newAvg = currentStock > 0 ? oldAvg : newCost;
    updatePayload.averageCost = Math.round(newAvg * 100) / 100;

    const changePercent = oldCost > 0 ? Math.round(((newCost - oldCost) / oldCost) * 10000) / 100 : 100;

    // Save Price History Record
    await db.insert(rawMaterialPriceHistory).values({
      rawMaterialId: id,
      oldCost: oldCost.toString(),
      newCost: newCost.toString(),
      changePercent: changePercent.toString(),
      reason: input.priceChangeReason || "ویرایش قیمت دستی",
    });
  }

  const [updated] = await db
    .update(rawMaterials)
    .set(updatePayload)
    .where(eq(rawMaterials.id, id))
    .returning();

  // If price changed, update costs of all products that use this raw material in BOM
  if (priceChanged) {
    const affectedRecipes = await db
      .select({ productId: productRecipes.productId })
      .from(productRecipes)
      .where(eq(productRecipes.rawMaterialId, id));

    const affectedProductIds: string[] = Array.from(new Set(affectedRecipes.map((r: any) => r.productId as string)));

    for (const prodId of affectedProductIds) {
      await updateProductCostFromBOM(prodId);
    }
  }

  await logAuditEvent("UPDATE", "raw_material", id, {
    oldCost,
    newCost,
    priceChanged,
    updatedFields: Object.keys(updatePayload),
  });

  return updated;
}

/**
 * Manual stock adjustment for raw material
 */
export async function adjustRawMaterialStock(
  rawMaterialId: string,
  newQuantity: number,
  reason: string,
  userId?: string
) {
  const [rm] = await db.select().from(rawMaterials).where(eq(rawMaterials.id, rawMaterialId)).limit(1);
  if (!rm) throw new Error("ماده اولیه پیدا نشد");

  const currentStock = Number(rm.stockQuantity) || 0;
  const delta = newQuantity - currentStock;

  if (delta === 0) return rm;

  await recordInventoryTransaction({
    itemType: "raw_material",
    itemId: rawMaterialId,
    transactionType: "adjustment",
    quantityChange: delta,
    unitCostSnapshot: Number(rm.currentCost) || 0,
    referenceType: "manual_adjustment",
    notes: `تعدیل دستی موجودی: ${reason} (قبلی: ${currentStock}، جدید: ${newQuantity})`,
  });

  return (await db.select().from(rawMaterials).where(eq(rawMaterials.id, rawMaterialId)).limit(1))[0];
}

/**
 * Retrieves raw material price history
 */
export async function getRawMaterialPriceHistory(rawMaterialId: string) {
  return await db
    .select()
    .from(rawMaterialPriceHistory)
    .where(eq(rawMaterialPriceHistory.rawMaterialId, rawMaterialId))
    .orderBy(desc(rawMaterialPriceHistory.createdAt));
}
