import { NextResponse } from "next/server";
import { db } from "@/db";
import { purchases, purchaseItems, suppliers, rawMaterials } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { recordInventoryTransaction } from "@/services/inventory";
import { updateRawMaterial } from "@/services/rawMaterial";
import { logAuditEvent } from "@/services/audit";

export async function GET() {
  try {
    const list = await db
      .select({
        purchase: purchases,
        supplierName: suppliers.name,
      })
      .from(purchases)
      .innerJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .orderBy(desc(purchases.createdAt));

    const formatted = list.map(({ purchase, supplierName }) => ({
      ...purchase,
      supplierName,
      grandTotal: Number(purchase.grandTotal),
      paidAmount: Number(purchase.paidAmount),
    }));

    return NextResponse.json({ success: true, purchases: formatted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.supplierId || !body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ success: false, error: "انتخاب تامین‌کننده و حداقل یک قلم خرید الزامی است." }, { status: 400 });
    }

    const purNum = `PUR-${Date.now().toString().slice(-6)}`;
    let grandTotal = 0;

    for (const item of body.items) {
      grandTotal += (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);
    }

    const [createdPurchase] = await db
      .insert(purchases)
      .values({
        purchaseNumber: purNum,
        supplierId: body.supplierId,
        projectId: body.projectId || null,
        subtotal: grandTotal.toString(),
        grandTotal: grandTotal.toString(),
        paidAmount: body.paidAmount ? body.paidAmount.toString() : "0",
        notes: body.notes || null,
      })
      .returning();

    for (const item of body.items) {
      const qty = Number(item.quantity);
      const unitCost = Number(item.unitCost);
      const totalCost = qty * unitCost;

      await db.insert(purchaseItems).values({
        purchaseId: createdPurchase.id,
        itemType: item.itemType || "raw_material",
        itemId: item.itemId,
        quantity: qty.toString(),
        unit: item.unit || "عدد",
        unitCost: unitCost.toString(),
        totalCost: totalCost.toString(),
      });

      // Update inventory ledger & cost history
      if (item.itemType === "raw_material") {
        await recordInventoryTransaction({
          itemType: "raw_material",
          itemId: item.itemId,
          transactionType: "purchase",
          quantityChange: qty, // Positive for purchase IN
          unitCostSnapshot: unitCost,
          referenceType: "purchase",
          referenceId: createdPurchase.id,
          projectId: body.projectId || null,
          notes: `خرید فاکتور شماره #${purNum}`,
        });

        // Update raw material cost & cost history
        await updateRawMaterial(item.itemId, {
          currentCost: unitCost,
          priceChangeReason: `به روزرسانی قیمت از خرید #${purNum}`,
        });
      }
    }

    await logAuditEvent("CREATE", "purchase", createdPurchase.id, { purchaseNumber: purNum, grandTotal });
    return NextResponse.json({ success: true, purchase: createdPurchase });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
