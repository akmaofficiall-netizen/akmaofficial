import { NextResponse } from "next/server";
import { db } from "@/db";
import { rawMaterials, suppliers } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { createRawMaterial, adjustRawMaterialStock } from "@/services/rawMaterial";
import { ensureRawMaterialsSchema } from "@/db/ensureSchema";

export async function GET() {
  try {
    await ensureRawMaterialsSchema();
    const list = await db
      .select({
        rawMaterial: rawMaterials,
        supplierName: suppliers.name,
      })
      .from(rawMaterials)
      .leftJoin(suppliers, eq(rawMaterials.supplierId, suppliers.id))
      .orderBy(desc(rawMaterials.createdAt));

    const formatted = list.map(({ rawMaterial, supplierName }: any) => ({
      ...rawMaterial,
      supplierName: supplierName || "نامشخص",
      stockQuantity: Number(rawMaterial.stockQuantity),
      minStockQuantity: Number(rawMaterial.minStockQuantity),
      currentCost: Number(rawMaterial.currentCost),
      averageCost: Number(rawMaterial.averageCost),
      isLowStock: Number(rawMaterial.stockQuantity) <= Number(rawMaterial.minStockQuantity),
    }));

    return NextResponse.json({ success: true, rawMaterials: formatted });
  } catch (error: any) {
    console.error("Raw materials API error", { message: error?.message, code: error?.code, detail: error?.detail });
    return NextResponse.json({ success: false, error: error?.message || "خطای پایگاه داده" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureRawMaterialsSchema();
    const body = await req.json();

    if (body.action === "adjust_stock") {
      const adjusted = await adjustRawMaterialStock(
        body.rawMaterialId,
        Number(body.newQuantity),
        body.reason || "تعدیل دستی"
      );
      return NextResponse.json({ success: true, rawMaterial: adjusted });
    }

    if (!body.name || !body.code || body.currentCost === undefined) {
      return NextResponse.json(
        { success: false, error: "کد، نام و قیمت ماده اولیه الزامی است." },
        { status: 400 }
      );
    }

    const created = await createRawMaterial({
      code: body.code,
      name: body.name,
      unit: body.unit || "کیلوگرم",
      unitConversionFactor: body.unitConversionFactor ? Number(body.unitConversionFactor) : 1,
      secondaryUnit: body.secondaryUnit || undefined,
      stockQuantity: body.stockQuantity !== undefined ? Number(body.stockQuantity) : 0,
      minStockQuantity: body.minStockQuantity !== undefined ? Number(body.minStockQuantity) : 10,
      currentCost: Number(body.currentCost),
      supplierId: body.supplierId || undefined,
      notes: body.notes || undefined,
    });

    return NextResponse.json({ success: true, rawMaterial: created });
  } catch (error: any) {
    console.error("Raw materials API error", { message: error?.message, code: error?.code, detail: error?.detail });
    return NextResponse.json({ success: false, error: error?.message || "خطای پایگاه داده" }, { status: 500 });
  }
}
