import { NextResponse } from "next/server";
import { db } from "@/db";
import { products, productRecipes, rawMaterials, projectProductPrices } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { updateProductCostFromBOM } from "@/services/pricing";
import { logAuditEvent } from "@/services/audit";
import { requirePermission } from "@/services/access";

export async function GET() {
  try { await requirePermission("products.view");
    const list = await db.select().from(products).orderBy(desc(products.createdAt));

    const formatted = list.map((p) => ({
      ...p,
      basePrice: Number(p.basePrice),
      calculatedCost: Number(p.calculatedCost),
      stockQuantity: Number(p.stockQuantity),
      minStockQuantity: Number(p.minStockQuantity),
      isLowStock: Number(p.stockQuantity) <= Number(p.minStockQuantity),
    }));

    return NextResponse.json({ success: true, products: formatted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await requirePermission(body?.action === "update_project_price" ? "projects.price.manage" : "products.create");

    // Handle stock adjustment
    if (body.action === "adjust_stock") {
      const { productId, newQuantity, reason } = body;
      if (!productId || newQuantity === undefined) {
        return NextResponse.json({ success: false, error: "شناسه محصول و مقدار موجودی الزامی است." }, { status: 400 });
      }

      const [prod] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
      if (!prod) return NextResponse.json({ success: false, error: "محصول یافت نشد." }, { status: 404 });

      const currentStock = Number(prod.stockQuantity) || 0;
      const targetStock = Number(newQuantity) || 0;
      const diff = targetStock - currentStock;

      const [updated] = await db
        .update(products)
        .set({ stockQuantity: targetStock.toString(), updatedAt: new Date() })
        .where(eq(products.id, productId))
        .returning();

      await logAuditEvent("ADJUST_STOCK", "product", productId, {
        previousStock: currentStock,
        newStock: targetStock,
        diff,
        reason: reason || "تعدیل دستی انبار",
      });

      return NextResponse.json({ success: true, product: updated });
    }

    // PROMPT FIX B: Handle project-specific price update strictly matching (projectId + productId)
    if (body.action === "update_project_price") {
      const { projectId, productId, customPrice } = body;
      if (!projectId || !productId || customPrice === undefined) {
        return NextResponse.json(
          { success: false, error: "شناسه پروژه، شناسه محصول و قیمت جدید الزامی است." },
          { status: 400 }
        );
      }

      // Strictly check existing project price on BOTH projectId AND productId
      const [existing] = await db
        .select()
        .from(projectProductPrices)
        .where(
          and(
            eq(projectProductPrices.projectId, projectId),
            eq(projectProductPrices.productId, productId)
          )
        )
        .limit(1);

      if (existing) {
        await db
          .update(projectProductPrices)
          .set({
            customPrice: customPrice.toString(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(projectProductPrices.projectId, projectId),
              eq(projectProductPrices.productId, productId)
            )
          );
      } else {
        await db.insert(projectProductPrices).values({
          projectId,
          productId,
          customPrice: customPrice.toString(),
        });
      }

      await logAuditEvent("UPDATE_PROJECT_PRICE", "product", productId, { projectId, customPrice });
      return NextResponse.json({ success: true, message: "قیمت پروژه با موفقیت به روز شد." });
    }

    if (!body.name || !body.code || body.basePrice === undefined) {
      return NextResponse.json(
        { success: false, error: "کد، نام و قیمت پایه محصول الزامی است." },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(products)
      .values({
        code: body.code,
        name: body.name,
        category: body.category || "عمومی",
        unit: body.unit || "عدد",
        basePrice: body.basePrice.toString(),
        calculatedCost: body.calculatedCost ? body.calculatedCost.toString() : "0",
        stockQuantity: body.stockQuantity ? body.stockQuantity.toString() : "0",
        minStockQuantity: body.minStockQuantity ? body.minStockQuantity.toString() : "5",
        status: body.status || "active",
      })
      .returning();

    // If BOM recipes provided, save recipes
    if (body.recipes && Array.isArray(body.recipes)) {
      for (const recipe of body.recipes) {
        await db.insert(productRecipes).values({
          productId: created.id,
          rawMaterialId: recipe.rawMaterialId,
          quantityRequired: recipe.quantityRequired.toString(),
          wastagePercent: recipe.wastagePercent ? recipe.wastagePercent.toString() : "0",
        });
      }
      await updateProductCostFromBOM(created.id);
    }

    await logAuditEvent("CREATE", "product", created.id, { name: created.name, code: created.code });
    return NextResponse.json({ success: true, product: created });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
